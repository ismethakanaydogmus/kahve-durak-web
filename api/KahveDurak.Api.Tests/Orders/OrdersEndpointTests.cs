using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using KahveDurak.Api.Features.Orders;
using KahveDurak.Api.Tests.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Time.Testing;

namespace KahveDurak.Api.Tests.Orders;

[Collection("postgres")]
public class OrdersEndpointTests(ApiFactory factory) : IAsyncLifetime
{
    // Monday 2026-10-19 12:00 Istanbul.
    private readonly FakeTimeProvider _clock = new(new DateTimeOffset(2026, 10, 19, 9, 0, 0, TimeSpan.Zero));
    private WebApplicationFactory<Program> _app = null!;

    public async Task InitializeAsync()
    {
        await factory.ResetDatabaseAsync();
        _app = factory.WithWebHostBuilder(b => b.ConfigureTestServices(s => s.AddSingleton<TimeProvider>(_clock)));
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private async Task<object> PickupBody()
    {
        await using var db = factory.CreateDbContext();
        var item = await TestData.ItemAsync(db, "Latte", 2, "Yulaf", "Small");
        return new { items = new[] { item }, fulfilment = "Pickup", lang = "tr" };
    }

    [Fact]
    public async Task Create_order_saves_pending_order_and_returns_payment_url()
    {
        var (userId, client) = await TestData.CustomerAsync(factory, _app.CreateClient());

        var response = await client.PostAsJsonAsync("/api/orders", await PickupBody());

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var orderId = body.GetProperty("orderId").GetInt32();
        Assert.Contains("/api/payments/fake/", body.GetProperty("paymentPageUrl").GetString());

        await using var db = factory.CreateDbContext();
        var order = await db.Orders.Include(o => o.History).SingleAsync(o => o.Id == orderId);
        Assert.Equal(userId, order.UserId);
        Assert.Equal(OrderStatus.PendingPayment, order.Status);
        Assert.False(string.IsNullOrEmpty(order.PaymentToken));
        Assert.Equal(410m, order.Total);
        Assert.Single(order.History);
    }

    private async Task Pay(string token) =>
        await _app.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false })
            .PostAsync($"/api/payments/fake/{token}", new FormUrlEncodedContent(new Dictionary<string, string> { ["result"] = "success" }));

    [Fact]
    public async Task Orders_list_hides_stale_pending_orders()
    {
        var (_, client) = await TestData.CustomerAsync(factory, _app.CreateClient());
        var paid = await Payments.PaymentCallbackTests.PlaceOrderAsync(factory, client);
        await Pay(paid.Token);
        var pending = await Payments.PaymentCallbackTests.PlaceOrderAsync(factory, client);

        var fresh = await client.GetFromJsonAsync<JsonElement>("/api/orders");
        Assert.Equal([pending.OrderId, paid.OrderId], fresh.EnumerateArray().Select(o => o.GetProperty("id").GetInt32()));

        _clock.Advance(TimeSpan.FromMinutes(31));
        var later = await client.GetFromJsonAsync<JsonElement>("/api/orders");

        var only = Assert.Single(later.EnumerateArray());
        Assert.Equal(paid.OrderId, only.GetProperty("id").GetInt32());
        Assert.Equal("Received", only.GetProperty("status").GetString());
        Assert.Equal(1, only.GetProperty("itemCount").GetInt32());
    }

    [Fact]
    public async Task Order_detail_is_404_for_other_users()
    {
        var (_, owner) = await TestData.CustomerAsync(factory, _app.CreateClient());
        var order = await Payments.PaymentCallbackTests.PlaceOrderAsync(factory, owner);
        var (_, stranger) = await TestData.CustomerAsync(factory, _app.CreateClient());

        Assert.Equal(HttpStatusCode.NotFound, (await stranger.GetAsync($"/api/orders/{order.OrderId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await owner.GetAsync("/api/orders/999999")).StatusCode);
    }

    [Fact]
    public async Task Order_detail_contains_snapshot_and_history()
    {
        var (userId, client) = await TestData.CustomerAsync(factory, _app.CreateClient());
        var addressId = await TestData.AddressAsync(factory, userId);
        object body;
        await using (var db = factory.CreateDbContext())
            body = new { items = new[] { await TestData.ItemAsync(db, "Latte", 2, "Yulaf", "Small") }, fulfilment = "Delivery", addressId, note = "Kapıya bırakın" };
        var created = await (await client.PostAsJsonAsync("/api/orders", body)).Content.ReadFromJsonAsync<JsonElement>();
        var orderId = created.GetProperty("orderId").GetInt32();
        await using (var db = factory.CreateDbContext())
            await Pay((await db.Orders.SingleAsync(o => o.Id == orderId)).PaymentToken!);

        var detail = await client.GetFromJsonAsync<JsonElement>($"/api/orders/{orderId}");

        Assert.Equal("Received", detail.GetProperty("status").GetString());
        Assert.Equal("Delivery", detail.GetProperty("fulfilment").GetString());
        Assert.Equal(440m, detail.GetProperty("total").GetDecimal());
        Assert.Equal(30m, detail.GetProperty("deliveryFee").GetDecimal());
        Assert.Equal("Kapıya bırakın", detail.GetProperty("note").GetString());
        Assert.Equal("Bulgurlu", detail.GetProperty("address").GetProperty("neighborhood").GetString());
        var item = detail.GetProperty("items")[0];
        Assert.Equal("Latte", item.GetProperty("nameTr").GetString());
        Assert.Equal(205m, item.GetProperty("unitPrice").GetDecimal());
        Assert.Equal(["Yulaf", "Small"], item.GetProperty("options").EnumerateArray().Select(o => o.GetProperty("nameTr").GetString()));
        Assert.Equal(["PendingPayment", "Received"],
            detail.GetProperty("history").EnumerateArray().Select(h => h.GetProperty("status").GetString()));
    }

    [Fact]
    public async Task Create_order_with_errors_returns_422_and_saves_nothing()
    {
        var (_, client) = await TestData.CustomerAsync(factory, _app.CreateClient());
        _clock.SetUtcNow(new DateTimeOffset(2026, 10, 20, 0, 0, 0, TimeSpan.Zero)); // Tue 03:00 Istanbul

        var response = await client.PostAsJsonAsync("/api/orders", await PickupBody());

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("SHOP_CLOSED", body.GetProperty("errors")[0].GetProperty("code").GetString());
        await using var db = factory.CreateDbContext();
        Assert.Equal(0, await db.Orders.CountAsync());
    }
}
