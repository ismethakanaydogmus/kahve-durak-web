using KahveDurak.Api.Features.Admin;
using KahveDurak.Api.Features.Orders;
using KahveDurak.Api.Features.Realtime;
using KahveDurak.Api.Tests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

namespace KahveDurak.Api.Tests.Realtime;

[Collection("postgres")]
public class OrdersHubTests(ApiFactory factory)
{
    private static readonly TimeSpan Wait = TimeSpan.FromSeconds(5);

    private IOrderNotifier Notifier => factory.Services.GetRequiredService<IOrderNotifier>();

    private Task<string> AdminToken() => HubClient.LoginAsync(factory.CreateClient(), ApiFactory.AdminEmail, ApiFactory.AdminPassword);

    [Fact]
    public async Task Anonymous_connection_is_rejected()
    {
        await Assert.ThrowsAnyAsync<Exception>(() => HubClient.ConnectAsync(factory, null));
    }

    [Fact]
    public async Task Admin_receives_events_sent_to_admins()
    {
        await using var admin = await HubClient.ConnectAsync(factory, await AdminToken());
        var (_, customerClient) = await TestData.CustomerAsync(factory);
        await using var customer = await HubClient.ConnectAsync(factory, HubClient.TokenOf(customerClient));
        var adminEvents = admin.Received("OrderCreated");
        var customerEvents = customer.Received("OrderCreated");

        await Notifier.OrderCreatedAsync(new AdminOrderSummaryDto(
            41, OrderStatus.Received, Fulfilment.Pickup, 180m, 1, DateTimeOffset.UtcNow, "Ayşe Demir", "+905551112233", null), default);

        var received = await adminEvents.NextAsync(Wait);
        Assert.NotNull(received);
        Assert.Equal(41, received.Value.GetProperty("id").GetInt32());
        Assert.Equal("Received", received.Value.GetProperty("status").GetString());
        Assert.Null(await customerEvents.NextAsync(TimeSpan.FromSeconds(1)));
    }

    [Fact]
    public async Task Paid_order_reaches_admins_as_OrderCreated()
    {
        var clock = new Microsoft.Extensions.Time.Testing.FakeTimeProvider(new DateTimeOffset(2026, 10, 19, 9, 0, 0, TimeSpan.Zero));
        var app = factory.WithWebHostBuilder(b => Microsoft.AspNetCore.TestHost.WebHostBuilderExtensions.ConfigureTestServices(b,
            s => s.AddSingleton<TimeProvider>(clock)));
        var adminToken = await HubClient.LoginAsync(app.CreateClient(), ApiFactory.AdminEmail, ApiFactory.AdminPassword);
        await using var admin = await HubClient.ConnectAsync(app, adminToken);
        var created = admin.Received("OrderCreated");
        var (_, customer) = await TestData.CustomerAsync(factory, app.CreateClient());

        var order = await Payments.PaymentCallbackTests.PlaceOrderAsync(factory, customer);
        await Admin.AdminOrdersEndpointTests.PayAsync(app, order.Token);

        var received = await created.NextAsync(Wait);
        Assert.NotNull(received);
        Assert.Equal(order.OrderId, received.Value.GetProperty("id").GetInt32());
        Assert.Equal("Ayşe Demir", received.Value.GetProperty("customerName").GetString());
    }

    [Fact]
    public async Task Advance_notifies_owner_and_admins_once()
    {
        var clock = new Microsoft.Extensions.Time.Testing.FakeTimeProvider(new DateTimeOffset(2026, 10, 19, 9, 0, 0, TimeSpan.Zero));
        var app = factory.WithWebHostBuilder(b => Microsoft.AspNetCore.TestHost.WebHostBuilderExtensions.ConfigureTestServices(b,
            s => s.AddSingleton<TimeProvider>(clock)));
        var adminToken = await HubClient.LoginAsync(app.CreateClient(), ApiFactory.AdminEmail, ApiFactory.AdminPassword);
        var (_, customer) = await TestData.CustomerAsync(factory, app.CreateClient());
        var order = await Payments.PaymentCallbackTests.PlaceOrderAsync(factory, customer);
        await Admin.AdminOrdersEndpointTests.PayAsync(app, order.Token);
        await using var adminHub = await HubClient.ConnectAsync(app, adminToken);
        await using var ownerHub = await HubClient.ConnectAsync(app, HubClient.TokenOf(customer));
        var adminEvents = adminHub.Received("OrderStatusChanged");
        var ownerEvents = ownerHub.Received("OrderStatusChanged");
        var adminClient = app.CreateClient();
        adminClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);

        await System.Net.Http.Json.HttpClientJsonExtensions.PostAsJsonAsync(adminClient, $"/api/admin/orders/{order.OrderId}/advance", new { expected = "Received" });

        foreach (var events in new[] { adminEvents, ownerEvents })
        {
            var e = await events.NextAsync(Wait);
            Assert.NotNull(e);
            Assert.Equal(order.OrderId, e.Value.GetProperty("orderId").GetInt32());
            Assert.Equal("Preparing", e.Value.GetProperty("status").GetString());
            Assert.Null(await events.NextAsync(TimeSpan.FromMilliseconds(500)));
        }
    }

    [Fact]
    public async Task Customer_receives_only_own_status_changes()
    {
        var (aId, aClient) = await TestData.CustomerAsync(factory);
        var (_, bClient) = await TestData.CustomerAsync(factory);
        await using var a = await HubClient.ConnectAsync(factory, HubClient.TokenOf(aClient));
        await using var b = await HubClient.ConnectAsync(factory, HubClient.TokenOf(bClient));
        var aEvents = a.Received("OrderStatusChanged");
        var bEvents = b.Received("OrderStatusChanged");

        await Notifier.OrderStatusChangedAsync(1, aId, OrderStatus.Preparing, DateTimeOffset.UtcNow, default);

        var received = await aEvents.NextAsync(Wait);
        Assert.NotNull(received);
        Assert.Equal(1, received.Value.GetProperty("orderId").GetInt32());
        Assert.Equal("Preparing", received.Value.GetProperty("status").GetString());
        Assert.Null(await bEvents.NextAsync(TimeSpan.FromSeconds(1)));
    }
}
