using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using KahveDurak.Api.Features.Admin;
using KahveDurak.Api.Features.Orders;
using KahveDurak.Api.Features.Realtime;
using KahveDurak.Api.Tests.Infrastructure;
using KahveDurak.Api.Tests.Payments;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Time.Testing;

namespace KahveDurak.Api.Tests.Admin;

/// <summary>A push that fails or is cancelled after the database commit must not undo or hide the change.</summary>
[Collection("postgres")]
public class NotificationFailureTests(ApiFactory factory) : IAsyncLifetime
{
    private sealed class CancelledNotifier : IOrderNotifier
    {
        public Task OrderCreatedAsync(AdminOrderSummaryDto order, CancellationToken ct) => throw new OperationCanceledException();
        public Task OrderStatusChangedAsync(int orderId, int userId, OrderStatus status, DateTimeOffset at, CancellationToken ct) =>
            throw new OperationCanceledException();
    }

    private readonly FakeTimeProvider _clock = new(new DateTimeOffset(2026, 10, 19, 9, 0, 0, TimeSpan.Zero));
    private WebApplicationFactory<Program> _app = null!;

    public async Task InitializeAsync()
    {
        await factory.ResetDatabaseAsync();
        _app = factory.WithWebHostBuilder(b => b.ConfigureTestServices(s =>
        {
            s.AddSingleton<TimeProvider>(_clock);
            s.AddSingleton<IOrderNotifier, CancelledNotifier>();
        }));
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task Payment_callback_still_redirects_when_the_admin_push_is_cancelled()
    {
        var (_, client) = await TestData.CustomerAsync(factory, _app.CreateClient());
        var order = await PaymentCallbackTests.PlaceOrderAsync(factory, client);
        var browser = _app.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

        var response = await browser.PostAsync($"/api/payments/fake/{order.Token}",
            new FormUrlEncodedContent(new Dictionary<string, string> { ["result"] = "success" }));

        Assert.Equal(HttpStatusCode.SeeOther, response.StatusCode);
        Assert.EndsWith("?odeme=basarili", response.Headers.Location!.ToString());
    }

    [Fact]
    public async Task Advance_succeeds_and_records_history_when_the_push_is_cancelled()
    {
        var (_, client) = await TestData.CustomerAsync(factory, _app.CreateClient());
        var order = await PaymentCallbackTests.PlaceOrderAsync(factory, client);
        await AdminOrdersEndpointTests.PayAsync(_app, order.Token);
        var admin = _app.CreateClient();
        admin.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer",
            await HubClient.LoginAsync(_app.CreateClient(), ApiFactory.AdminEmail, ApiFactory.AdminPassword));

        var response = await admin.PostAsJsonAsync($"/api/admin/orders/{order.OrderId}/advance", new { expected = "Received" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await using var db = factory.CreateDbContext();
        var saved = await db.Orders.Include(o => o.History).SingleAsync(o => o.Id == order.OrderId);
        Assert.Equal(OrderStatus.Preparing, saved.Status);
        Assert.Contains(saved.History, h => h.Status == OrderStatus.Preparing);
    }
}
