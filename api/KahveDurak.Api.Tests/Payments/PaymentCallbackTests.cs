using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using KahveDurak.Api.Features.Orders;
using KahveDurak.Api.Features.Payments;
using KahveDurak.Api.Tests.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Time.Testing;

namespace KahveDurak.Api.Tests.Payments;

[Collection("postgres")]
public class PaymentCallbackTests(ApiFactory factory) : IAsyncLifetime
{
    private readonly FakeTimeProvider _clock = new(new DateTimeOffset(2026, 10, 19, 9, 0, 0, TimeSpan.Zero));
    private WebApplicationFactory<Program> _app = null!;
    private HttpClient _browser = null!;

    public async Task InitializeAsync()
    {
        await factory.ResetDatabaseAsync();
        _app = factory.WithWebHostBuilder(b => b.ConfigureTestServices(s => s.AddSingleton<TimeProvider>(_clock)));
        _browser = _app.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private FakePaymentGateway Gateway => _app.Services.GetRequiredService<FakePaymentGateway>();

    /// <summary>Places a pickup order through the API and returns its id, token and total.</summary>
    internal static async Task<(int OrderId, string Token, decimal Total)> PlaceOrderAsync(ApiFactory factory, HttpClient client)
    {
        object body;
        await using (var db = factory.CreateDbContext())
            body = new { items = new[] { await TestData.ItemAsync(db, "Latte", 1, "Normal", "Small") }, fulfilment = "Pickup" };
        var response = await client.PostAsJsonAsync("/api/orders", body);
        response.EnsureSuccessStatusCode();
        var orderId = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("orderId").GetInt32();
        await using var db2 = factory.CreateDbContext();
        var order = await db2.Orders.SingleAsync(o => o.Id == orderId);
        return (orderId, order.PaymentToken!, order.Total);
    }

    private async Task<(int OrderId, string Token, decimal Total)> Order()
    {
        var (_, client) = await TestData.CustomerAsync(factory, _app.CreateClient());
        return await PlaceOrderAsync(factory, client);
    }

    private Task<HttpResponseMessage> Callback(string token) =>
        _browser.PostAsync("/api/payments/iyzico/callback", new FormUrlEncodedContent(new Dictionary<string, string> { ["token"] = token }));

    private async Task<(OrderStatus Status, int History)> State(int orderId)
    {
        await using var db = factory.CreateDbContext();
        var order = await db.Orders.Include(o => o.History).SingleAsync(o => o.Id == orderId);
        return (order.Status, order.History.Count);
    }

    [Fact]
    public async Task Successful_callback_marks_order_received_and_redirects()
    {
        var (orderId, token, _) = await Order();
        Gateway.SetOutcome(token, true);

        var response = await Callback(token);

        Assert.Equal(HttpStatusCode.SeeOther, response.StatusCode);
        Assert.Equal($"http://frontend.test/siparis/{orderId}?odeme=basarili", response.Headers.Location!.ToString());
        Assert.Equal((OrderStatus.Received, 2), await State(orderId));
        await using var db = factory.CreateDbContext();
        Assert.StartsWith("fake-", (await db.Orders.SingleAsync(o => o.Id == orderId)).PaymentId);
    }

    [Fact]
    public async Task Failed_callback_marks_payment_failed()
    {
        var (orderId, token, _) = await Order();
        Gateway.SetOutcome(token, false);

        var response = await Callback(token);

        Assert.EndsWith($"/siparis/{orderId}?odeme=basarisiz", response.Headers.Location!.ToString());
        Assert.Equal(OrderStatus.PaymentFailed, (await State(orderId)).Status);
    }

    [Fact]
    public async Task Amount_mismatch_marks_payment_failed()
    {
        var (orderId, token, total) = await Order();
        Gateway.SetOutcome(token, true, paidPriceOverride: total - 1);

        await Callback(token);

        Assert.Equal(OrderStatus.PaymentFailed, (await State(orderId)).Status);
    }

    [Fact]
    public async Task Basket_mismatch_marks_payment_failed()
    {
        var (orderId, token, _) = await Order();
        Gateway.SetOutcome(token, true, basketIdOverride: "999999");

        await Callback(token);

        Assert.Equal(OrderStatus.PaymentFailed, (await State(orderId)).Status);
    }

    [Fact]
    public async Task Concurrent_callbacks_settle_the_order_once()
    {
        var (orderId, token, _) = await Order();
        Gateway.SetOutcome(token, true);

        var responses = await Task.WhenAll(Enumerable.Range(0, 6).Select(_ => Callback(token)));

        Assert.All(responses, r => Assert.EndsWith("?odeme=basarili", r.Headers.Location!.ToString()));
        Assert.Equal((OrderStatus.Received, 2), await State(orderId));
    }

    [Fact]
    public async Task Mismatched_payment_keeps_the_payment_id_for_a_refund()
    {
        var (orderId, token, total) = await Order();
        Gateway.SetOutcome(token, true, paidPriceOverride: total - 1);

        await Callback(token);

        await using var db = factory.CreateDbContext();
        var order = await db.Orders.SingleAsync(o => o.Id == orderId);
        Assert.Equal(OrderStatus.PaymentFailed, order.Status);
        Assert.StartsWith("fake-", order.PaymentId);
    }

    [Fact]
    public async Task Unreachable_gateway_leaves_the_order_pending_and_says_checking()
    {
        var (orderId, token, _) = await Order();
        Gateway.SetUnavailable(token);

        var response = await Callback(token);

        Assert.EndsWith($"/siparis/{orderId}?odeme=kontrol", response.Headers.Location!.ToString());
        Assert.Equal((OrderStatus.PendingPayment, 1), await State(orderId));

        Gateway.SetOutcome(token, true);
        await Callback(token);
        Assert.Equal(OrderStatus.Received, (await State(orderId)).Status);
    }

    [Fact]
    public async Task Gateway_exception_leaves_the_order_pending()
    {
        var (orderId, token, _) = await Order();
        Gateway.SetThrows(token);

        var response = await Callback(token);

        Assert.Equal(HttpStatusCode.SeeOther, response.StatusCode);
        Assert.EndsWith("?odeme=kontrol", response.Headers.Location!.ToString());
        Assert.Equal(OrderStatus.PendingPayment, (await State(orderId)).Status);
    }

    [Fact]
    public async Task Repeated_callback_changes_nothing()
    {
        var (orderId, token, _) = await Order();
        Gateway.SetOutcome(token, true);
        await Callback(token);
        Gateway.SetOutcome(token, false);

        var again = await Callback(token);

        Assert.Equal(HttpStatusCode.SeeOther, again.StatusCode);
        Assert.EndsWith("?odeme=basarili", again.Headers.Location!.ToString());
        Assert.Equal((OrderStatus.Received, 2), await State(orderId));
    }

    [Fact]
    public async Task Unknown_token_redirects_to_account()
    {
        var response = await Callback("does-not-exist");

        Assert.Equal(HttpStatusCode.SeeOther, response.StatusCode);
        Assert.Equal("http://frontend.test/hesap?odeme=bulunamadi", response.Headers.Location!.ToString());
    }

    [Fact]
    public async Task Fake_payment_page_completes_payment()
    {
        var (orderId, token, _) = await Order();

        var page = await _browser.GetAsync($"/api/payments/fake/{token}");
        Assert.Equal(HttpStatusCode.OK, page.StatusCode);
        var html = await page.Content.ReadAsStringAsync();
        Assert.Contains("Test ödemesi", html);
        Assert.Contains("₺175,00", html);

        var submit = await _browser.PostAsync($"/api/payments/fake/{token}",
            new FormUrlEncodedContent(new Dictionary<string, string> { ["result"] = "success" }));

        Assert.Equal(HttpStatusCode.SeeOther, submit.StatusCode);
        Assert.EndsWith($"/siparis/{orderId}?odeme=basarili", submit.Headers.Location!.ToString());
        Assert.Equal(OrderStatus.Received, (await State(orderId)).Status);
    }
}
