using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using KahveDurak.Api.Data.Entities;
using KahveDurak.Api.Features.Orders;
using KahveDurak.Api.Tests.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Time.Testing;

namespace KahveDurak.Api.Tests.Admin;

[Collection("postgres")]
public class AdminDashboardTests(ApiFactory factory) : IAsyncLifetime
{
    private static readonly TimeSpan Istanbul = TimeSpan.FromHours(3);

    // Tuesday 2026-10-20 15:00 Istanbul.
    private readonly FakeTimeProvider _clock = new(new DateTimeOffset(2026, 10, 20, 15, 0, 0, Istanbul));
    private WebApplicationFactory<Program> _app = null!;
    private HttpClient _admin = null!;
    private int _userId;

    public async Task InitializeAsync()
    {
        await factory.ResetDatabaseAsync();
        _app = factory.WithWebHostBuilder(b => b.ConfigureTestServices(s => s.AddSingleton<TimeProvider>(_clock)));
        _admin = _app.CreateClient();
        _admin.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer",
            await HubClient.LoginAsync(_app.CreateClient(), ApiFactory.AdminEmail, ApiFactory.AdminPassword));
        (_userId, _) = await TestData.CustomerAsync(factory, _app.CreateClient());
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private static DateTimeOffset Ist(int day, int hour, int minute = 0) => new DateTimeOffset(2026, 10, day, hour, minute, 0, Istanbul).ToUniversalTime();

    private Task AddOrder(DateTimeOffset at, OrderStatus status, params (string Name, int Qty, decimal Line)[] items) =>
        AddOrderFor(1, at, status, items);

    private async Task AddOrderFor(int productId, DateTimeOffset at, OrderStatus status, params (string Name, int Qty, decimal Line)[] items)
    {
        await using var db = factory.CreateDbContext();
        db.Orders.Add(new Order
        {
            UserId = _userId, Status = status, Fulfilment = Fulfilment.Pickup, CreatedAt = at, UpdatedAt = at,
            Subtotal = items.Sum(i => i.Line), Total = items.Sum(i => i.Line),
            Items = items.Select((i, n) => new OrderItem { ProductId = productId == 1 ? 1000 + Math.Abs(i.Name.GetHashCode() % 1000) : productId, NameTr = i.Name, Quantity = i.Qty, UnitPrice = i.Line / i.Qty, LineTotal = i.Line }).ToList(),
        });
        await db.SaveChangesAsync();
    }

    private Task<JsonElement> Dashboard() => _admin.GetFromJsonAsync<JsonElement>("/api/admin/dashboard");

    [Fact]
    public async Task Counts_only_paid_orders_from_istanbul_midnight()
    {
        await AddOrder(Ist(20, 0, 30), OrderStatus.Received, ("Latte", 1, 100m));
        await AddOrder(Ist(20, 10), OrderStatus.Completed, ("Mocha", 1, 250m));
        await AddOrder(Ist(20, 11), OrderStatus.Cancelled, ("Su", 1, 999m));
        await AddOrder(Ist(20, 12), OrderStatus.PaymentFailed, ("Su", 1, 999m));
        await AddOrder(Ist(19, 23, 30), OrderStatus.Completed, ("Latte", 1, 500m));

        var d = await Dashboard();

        Assert.Equal(350m, d.GetProperty("todayRevenue").GetDecimal());
        Assert.Equal(2, d.GetProperty("todayOrders").GetInt32());
        Assert.Equal(175m, d.GetProperty("averageBasket").GetDecimal());
    }

    [Fact]
    public async Task Top_products_last_7_days_by_quantity()
    {
        await AddOrder(Ist(20, 9), OrderStatus.Completed, ("Latte", 3, 540m), ("Su", 3, 120m));
        await AddOrder(Ist(18, 9), OrderStatus.Completed, ("Mocha", 2, 400m), ("Çay", 1, 50m));
        await AddOrder(Ist(14, 9), OrderStatus.Completed, ("Soda", 1, 70m), ("Cold Brew", 1, 220m));
        await AddOrder(Ist(14, 9), OrderStatus.Cancelled, ("Çay", 9, 450m));
        await AddOrder(Ist(12, 9), OrderStatus.Completed, ("Çay", 50, 2500m)); // 8 days ago

        var top = (await Dashboard()).GetProperty("topProducts").EnumerateArray()
            .Select(p => (p.GetProperty("nameTr").GetString(), p.GetProperty("quantity").GetInt32())).ToList();

        Assert.Equal(5, top.Count);
        Assert.Equal(("Latte", 3), top[0]); // 3 units, ₺540 beats Su's 3 units, ₺120
        Assert.Equal(("Su", 3), top[1]);
        Assert.Equal(("Mocha", 2), top[2]);
        Assert.Equal(("Cold Brew", 1), top[3]); // ₺220 beats Soda ₺70 and Çay ₺50
        Assert.Equal(("Soda", 1), top[4]);
    }

    [Fact]
    public async Task Renamed_product_is_one_row()
    {
        await AddOrderFor(77, Ist(18, 9), OrderStatus.Completed, ("Latte", 2, 360m));
        await AddOrderFor(77, Ist(20, 9), OrderStatus.Completed, ("Latte (yeni)", 1, 190m));

        var top = (await Dashboard()).GetProperty("topProducts").EnumerateArray().ToList();

        var only = Assert.Single(top);
        Assert.Equal("Latte (yeni)", only.GetProperty("nameTr").GetString());
        Assert.Equal(3, only.GetProperty("quantity").GetInt32());
        Assert.Equal(550m, only.GetProperty("revenue").GetDecimal());
    }

    [Fact]
    public async Task Empty_day_returns_zeros()
    {
        var d = await Dashboard();

        Assert.Equal(0m, d.GetProperty("todayRevenue").GetDecimal());
        Assert.Equal(0, d.GetProperty("todayOrders").GetInt32());
        Assert.Equal(0m, d.GetProperty("averageBasket").GetDecimal());
        Assert.Empty(d.GetProperty("topProducts").EnumerateArray());
    }

    [Fact]
    public async Task Customer_gets_403()
    {
        var (_, customer) = await TestData.CustomerAsync(factory, _app.CreateClient());

        Assert.Equal(HttpStatusCode.Forbidden, (await customer.GetAsync("/api/admin/dashboard")).StatusCode);
    }
}
