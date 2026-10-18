using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using KahveDurak.Api.Features.Orders;
using KahveDurak.Api.Tests.Infrastructure;
using KahveDurak.Api.Tests.Payments;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Time.Testing;

namespace KahveDurak.Api.Tests.Admin;

[Collection("postgres")]
public class AdminOrdersEndpointTests(ApiFactory factory) : IAsyncLifetime
{
    private readonly FakeTimeProvider _clock = new(new DateTimeOffset(2026, 10, 19, 9, 0, 0, TimeSpan.Zero));
    private WebApplicationFactory<Program> _app = null!;
    private HttpClient _admin = null!;

    public async Task InitializeAsync()
    {
        await factory.ResetDatabaseAsync();
        _app = factory.WithWebHostBuilder(b => b.ConfigureTestServices(s => s.AddSingleton<TimeProvider>(_clock)));
        _admin = _app.CreateClient();
        _admin.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer",
            await HubClient.LoginAsync(_app.CreateClient(), ApiFactory.AdminEmail, ApiFactory.AdminPassword));
    }

    public Task DisposeAsync() => Task.CompletedTask;

    internal static async Task PayAsync(WebApplicationFactory<Program> app, string token) =>
        await app.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false })
            .PostAsync($"/api/payments/fake/{token}", new FormUrlEncodedContent(new Dictionary<string, string> { ["result"] = "success" }));

    /// <summary>A paid pickup order placed by a fresh customer.</summary>
    private async Task<int> PaidOrder()
    {
        var (_, client) = await TestData.CustomerAsync(factory, _app.CreateClient());
        var order = await PaymentCallbackTests.PlaceOrderAsync(factory, client);
        await PayAsync(_app, order.Token);
        return order.OrderId;
    }

    private async Task SetStatus(int orderId, OrderStatus status)
    {
        await using var db = factory.CreateDbContext();
        await db.Orders.Where(o => o.Id == orderId).ExecuteUpdateAsync(s => s.SetProperty(o => o.Status, status));
    }

    private async Task<int[]> Ids(string filter) =>
        (await _admin.GetFromJsonAsync<JsonElement>($"/api/admin/orders?filter={filter}"))
            .EnumerateArray().Select(o => o.GetProperty("id").GetInt32()).ToArray();

    [Fact]
    public async Task Customer_gets_403_and_anonymous_401()
    {
        var (_, customer) = await TestData.CustomerAsync(factory, _app.CreateClient());

        Assert.Equal(HttpStatusCode.Forbidden, (await customer.GetAsync("/api/admin/orders")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _app.CreateClient().GetAsync("/api/admin/orders")).StatusCode);
    }

    [Fact]
    public async Task Active_filter_lists_paid_orders_oldest_first_and_hides_pending()
    {
        var first = await PaidOrder();
        _clock.Advance(TimeSpan.FromMinutes(5));
        var second = await PaidOrder();
        var (_, client) = await TestData.CustomerAsync(factory, _app.CreateClient());
        var pending = await PaymentCallbackTests.PlaceOrderAsync(factory, client);

        var list = await _admin.GetFromJsonAsync<JsonElement>("/api/admin/orders");

        Assert.Equal([first, second], list.EnumerateArray().Select(o => o.GetProperty("id").GetInt32()));
        Assert.Equal("Ayşe Demir", list[0].GetProperty("customerName").GetString());
        Assert.Equal("+905551112233", list[0].GetProperty("customerPhone").GetString());
        Assert.DoesNotContain(pending.OrderId, await Ids("all"));
    }

    [Fact]
    public async Task Completed_and_cancelled_filters()
    {
        var done = await PaidOrder();
        var cancelled = await PaidOrder();
        var active = await PaidOrder();
        await SetStatus(done, OrderStatus.Completed);
        await SetStatus(cancelled, OrderStatus.Cancelled);

        Assert.Equal([active], await Ids("active"));
        Assert.Equal([done], await Ids("completed"));
        Assert.Equal([cancelled], await Ids("cancelled"));
        Assert.Equal([active, cancelled, done], await Ids("all"));
    }

    [Fact]
    public async Task Detail_includes_customer_and_allowed_actions()
    {
        var id = await PaidOrder();

        var received = await _admin.GetFromJsonAsync<JsonElement>($"/api/admin/orders/{id}");
        Assert.Equal("Preparing", received.GetProperty("next").GetString());
        Assert.True(received.GetProperty("canCancel").GetBoolean());
        Assert.Equal("Ayşe Demir", received.GetProperty("customer").GetProperty("name").GetString());
        Assert.Equal("Latte", received.GetProperty("order").GetProperty("items")[0].GetProperty("nameTr").GetString());

        await SetStatus(id, OrderStatus.Ready);
        var ready = await _admin.GetFromJsonAsync<JsonElement>($"/api/admin/orders/{id}");
        Assert.Equal("Completed", ready.GetProperty("next").GetString());
        Assert.False(ready.GetProperty("canCancel").GetBoolean());
    }

    private Task<HttpResponseMessage> Act(int id, string action, string expected) =>
        _admin.PostAsJsonAsync($"/api/admin/orders/{id}/{action}", new { expected });

    private async Task<(OrderStatus Status, int History)> State(int id)
    {
        await using var db = factory.CreateDbContext();
        var o = await db.Orders.Include(x => x.History).SingleAsync(x => x.Id == id);
        return (o.Status, o.History.Count);
    }

    [Fact]
    public async Task Advance_walks_pickup_order_to_completed()
    {
        var id = await PaidOrder();

        foreach (var (expected, next) in new[] { ("Received", "Preparing"), ("Preparing", "Ready"), ("Ready", "Completed") })
        {
            var response = await Act(id, "advance", expected);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(next, (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("order").GetProperty("status").GetString());
        }

        Assert.Equal((OrderStatus.Completed, 5), await State(id));
    }

    [Fact]
    public async Task Advance_walks_delivery_order_through_on_the_way()
    {
        var (userId, client) = await TestData.CustomerAsync(factory, _app.CreateClient());
        var addressId = await TestData.AddressAsync(factory, userId);
        object body;
        await using (var db = factory.CreateDbContext())
            body = new { items = new[] { await TestData.ItemAsync(db, "Latte", 2, "Normal", "Small") }, fulfilment = "Delivery", addressId };
        var id = (await (await client.PostAsJsonAsync("/api/orders", body)).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("orderId").GetInt32();
        await using (var db = factory.CreateDbContext())
            await PayAsync(_app, (await db.Orders.SingleAsync(o => o.Id == id)).PaymentToken!);

        await Act(id, "advance", "Received");
        var onTheWay = await Act(id, "advance", "Preparing");

        Assert.Equal("OnTheWay", (await onTheWay.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("order").GetProperty("status").GetString());
    }

    [Fact]
    public async Task Advance_with_stale_expected_status_is_409()
    {
        var id = await PaidOrder();
        await Act(id, "advance", "Received");

        var stale = await Act(id, "advance", "Received");

        Assert.Equal(HttpStatusCode.Conflict, stale.StatusCode);
        Assert.Contains("az önce güncellendi", await stale.Content.ReadAsStringAsync());
        Assert.Equal((OrderStatus.Preparing, 3), await State(id));
    }

    [Fact]
    public async Task Concurrent_advances_succeed_once()
    {
        var id = await PaidOrder();

        var responses = await Task.WhenAll(Enumerable.Range(0, 5).Select(_ => Act(id, "advance", "Received")));

        Assert.Single(responses, r => r.StatusCode == HttpStatusCode.OK);
        Assert.All(responses.Where(r => r.StatusCode != HttpStatusCode.OK), r => Assert.Equal(HttpStatusCode.Conflict, r.StatusCode));
        Assert.Equal((OrderStatus.Preparing, 3), await State(id));
    }

    [Fact]
    public async Task Cannot_advance_completed_or_cancelled()
    {
        var done = await PaidOrder();
        var cancelled = await PaidOrder();
        await SetStatus(done, OrderStatus.Completed);
        await SetStatus(cancelled, OrderStatus.Cancelled);

        Assert.Equal(HttpStatusCode.BadRequest, (await Act(done, "advance", "Completed")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Act(cancelled, "advance", "Cancelled")).StatusCode);
    }

    [Fact]
    public async Task Cancel_allowed_until_preparing_only()
    {
        var preparing = await PaidOrder();
        var ready = await PaidOrder();
        await SetStatus(preparing, OrderStatus.Preparing);
        await SetStatus(ready, OrderStatus.Ready);

        Assert.Equal(HttpStatusCode.OK, (await Act(preparing, "cancel", "Preparing")).StatusCode);
        Assert.Equal(OrderStatus.Cancelled, (await State(preparing)).Status);
        Assert.Equal(HttpStatusCode.BadRequest, (await Act(ready, "cancel", "Ready")).StatusCode);
    }

    [Fact]
    public async Task Actions_on_missing_or_pending_orders_are_404()
    {
        var (_, client) = await TestData.CustomerAsync(factory, _app.CreateClient());
        var pending = await PaymentCallbackTests.PlaceOrderAsync(factory, client);

        Assert.Equal(HttpStatusCode.NotFound, (await Act(999999, "advance", "Received")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Act(pending.OrderId, "advance", "PendingPayment")).StatusCode);
    }

    [Fact]
    public async Task Detail_of_pending_order_is_404()
    {
        var (_, client) = await TestData.CustomerAsync(factory, _app.CreateClient());
        var pending = await PaymentCallbackTests.PlaceOrderAsync(factory, client);

        Assert.Equal(HttpStatusCode.NotFound, (await _admin.GetAsync($"/api/admin/orders/{pending.OrderId}")).StatusCode);
    }
}
