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
public class CheckoutServiceTests(ApiFactory factory) : IAsyncLifetime
{
    // Monday 2026-10-19 12:00 Istanbul = 09:00 UTC.
    private readonly FakeTimeProvider _clock = new(new DateTimeOffset(2026, 10, 19, 9, 0, 0, TimeSpan.Zero));
    private WebApplicationFactory<Program> _app = null!;

    public async Task InitializeAsync()
    {
        await factory.ResetDatabaseAsync();
        _app = factory.WithWebHostBuilder(b => b.ConfigureTestServices(s => s.AddSingleton<TimeProvider>(_clock)));
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private async Task<(int UserId, HttpClient Client)> Customer() => await TestData.CustomerAsync(factory, _app.CreateClient());

    private async Task<QuoteDto> Quote(int userId, Fulfilment fulfilment, int? addressId, params CheckoutItemRequest[] items)
    {
        using var scope = _app.Services.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<CheckoutService>();
        return await service.QuoteAsync(userId, new CheckoutRequest(items, fulfilment, addressId, null, "tr"), CancellationToken.None);
    }

    private async Task<Api.Features.Orders.CheckoutItemRequest> Item(string product, int qty, params string[] options)
    {
        await using var db = factory.CreateDbContext();
        return await TestData.ItemAsync(db, product, qty, options);
    }

    private static string[] Codes(QuoteDto q) => q.Errors.Select(e => e.Code).ToArray();

    [Fact]
    public async Task Latte_large_oat_extra_shot_price_is_computed_on_server()
    {
        var (userId, _) = await Customer();

        var quote = await Quote(userId, Fulfilment.Pickup, null, await Item("Latte", 2, "Yulaf", "Large", "Ekstra shot"));

        Assert.Empty(quote.Errors);
        var line = Assert.Single(quote.Lines);
        Assert.Equal(285m, line.UnitPrice);
        Assert.Equal(570m, line.LineTotal);
        Assert.Equal(570m, quote.Subtotal);
        Assert.Equal(0m, quote.DeliveryFee);
        Assert.Equal(570m, quote.Total);
        Assert.True(quote.CanOrder);
        Assert.Equal(["Yulaf", "Large", "Ekstra shot"], line.Options.Select(o => o.NameTr));
    }

    [Fact]
    public async Task Uses_current_db_price_after_admin_change()
    {
        var (userId, _) = await Customer();
        await using (var db = factory.CreateDbContext())
        {
            (await db.Products.SingleAsync(p => p.NameTr == "Latte")).Price = 200m;
            await db.SaveChangesAsync();
        }

        var quote = await Quote(userId, Fulfilment.Pickup, null, await Item("Latte", 1, "Normal", "Small"));

        Assert.Equal(200m, quote.Lines.Single().UnitPrice);
    }

    [Fact]
    public async Task Delivery_adds_fee_and_enforces_minimum_on_subtotal()
    {
        var (userId, _) = await Customer();
        var address = await TestData.AddressAsync(factory, userId);

        var small = await Quote(userId, Fulfilment.Delivery, address, await Item("Espresso", 1, "Single"));
        var enough = await Quote(userId, Fulfilment.Delivery, address, await Item("Latte", 2, "Normal", "Small"));

        Assert.Equal(["BELOW_MINIMUM"], Codes(small));
        Assert.Equal(30m, small.DeliveryFee);
        Assert.Equal(200m, small.MinOrderAmount);
        Assert.Empty(enough.Errors);
        Assert.Equal(350m, enough.Subtotal);
        Assert.Equal(380m, enough.Total);
    }

    [Fact]
    public async Task Pickup_has_no_minimum()
    {
        var (userId, _) = await Customer();

        var quote = await Quote(userId, Fulfilment.Pickup, null, await Item("Su", 1));

        Assert.Empty(quote.Errors);
        Assert.Equal(30m, quote.Total);
    }

    [Fact]
    public async Task Missing_required_option_is_rejected()
    {
        var (userId, _) = await Customer();

        var quote = await Quote(userId, Fulfilment.Pickup, null, await Item("Latte", 1, "Small"));

        Assert.Contains("OPTION_REQUIRED", Codes(quote));
        Assert.False(quote.CanOrder);
    }

    [Fact]
    public async Task Option_from_another_product_is_rejected()
    {
        var (userId, _) = await Customer();
        var latte = await Item("Latte", 1, "Normal", "Small");
        var espressoDouble = (await Item("Espresso", 1, "Double")).OptionIds[0];

        var quote = await Quote(userId, Fulfilment.Pickup, null, latte with { OptionIds = [.. latte.OptionIds, espressoDouble] });

        Assert.Contains("OPTION_INVALID", Codes(quote));
    }

    [Fact]
    public async Task Two_options_in_single_choice_group_is_rejected()
    {
        var (userId, _) = await Customer();

        var quote = await Quote(userId, Fulfilment.Pickup, null, await Item("Latte", 1, "Normal", "Yulaf", "Small"));

        Assert.Contains("OPTION_INVALID", Codes(quote));
    }

    [Fact]
    public async Task Unavailable_or_deleted_product_is_rejected()
    {
        var (userId, _) = await Customer();
        var soda = await Item("Soda", 1);
        var water = await Item("Su", 1);
        await using (var db = factory.CreateDbContext())
        {
            (await db.Products.SingleAsync(p => p.NameTr == "Soda")).IsAvailable = false;
            (await db.Products.SingleAsync(p => p.NameTr == "Su")).IsDeleted = true;
            await db.SaveChangesAsync();
        }

        var quote = await Quote(userId, Fulfilment.Pickup, null, soda, water);

        Assert.Equal(2, quote.Errors.Count(e => e.Code == "PRODUCT_UNAVAILABLE"));
        Assert.Contains(quote.Errors, e => e.ProductId == soda.ProductId);
        Assert.Contains(quote.Errors, e => e.ProductId == water.ProductId);
    }

    [Fact]
    public async Task Product_in_inactive_category_is_rejected()
    {
        var (userId, _) = await Customer();
        var tea = await Item("Çay", 1, "Bardak");
        await using (var db = factory.CreateDbContext())
        {
            (await db.Categories.SingleAsync(c => c.NameTr == "Çaylar")).IsActive = false;
            await db.SaveChangesAsync();
        }

        var quote = await Quote(userId, Fulfilment.Pickup, null, tea);

        Assert.Contains(quote.Errors, e => e.Code == "PRODUCT_UNAVAILABLE" && e.ProductId == tea.ProductId);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(21)]
    public async Task Quantity_outside_1_to_20_is_rejected(int quantity)
    {
        var (userId, _) = await Customer();

        var quote = await Quote(userId, Fulfilment.Pickup, null, await Item("Su", quantity));

        Assert.Contains("QUANTITY_INVALID", Codes(quote));
    }

    [Fact]
    public async Task Undefined_fulfilment_is_rejected()
    {
        var (userId, _) = await Customer();

        var quote = await Quote(userId, (Fulfilment)5, null, await Item("Su", 1));

        Assert.Contains("FULFILMENT_INVALID", Codes(quote));
    }

    [Fact]
    public async Task Closed_shop_rejects_at_0300()
    {
        var (userId, _) = await Customer();
        _clock.SetUtcNow(new DateTimeOffset(2026, 10, 20, 0, 0, 0, TimeSpan.Zero)); // Tue 03:00 Istanbul

        var quote = await Quote(userId, Fulfilment.Pickup, null, await Item("Su", 1));

        Assert.Equal(["SHOP_CLOSED"], Codes(quote));
    }

    [Fact]
    public async Task Delivery_requires_own_address_in_active_neighborhood()
    {
        var (userId, _) = await Customer();
        var (otherId, _) = await Customer();
        var othersAddress = await TestData.AddressAsync(factory, otherId);
        var kuzguncuk = await TestData.AddressAsync(factory, userId, "Kuzguncuk");
        await using (var db = factory.CreateDbContext())
        {
            (await db.DeliveryNeighborhoods.SingleAsync(n => n.Name == "Kuzguncuk")).IsActive = false;
            await db.SaveChangesAsync();
        }
        var item = await Item("Latte", 2, "Normal", "Small");

        Assert.Contains("ADDRESS_REQUIRED", Codes(await Quote(userId, Fulfilment.Delivery, null, item)));
        Assert.Contains("ADDRESS_INVALID", Codes(await Quote(userId, Fulfilment.Delivery, othersAddress, item)));
        Assert.Contains("NEIGHBORHOOD_NOT_SERVED", Codes(await Quote(userId, Fulfilment.Delivery, kuzguncuk, item)));
    }

    [Fact]
    public async Task BuildOrder_snapshots_names_prices_and_address()
    {
        var (userId, _) = await Customer();
        var address = await TestData.AddressAsync(factory, userId);
        var request = new CheckoutRequest([await Item("Latte", 2, "Yulaf", "Small")], Fulfilment.Delivery, address, "Zile basmayın", "tr");

        int orderId;
        using (var scope = _app.Services.CreateScope())
        {
            var service = scope.ServiceProvider.GetRequiredService<CheckoutService>();
            var (order, quote) = await service.BuildOrderAsync(userId, request, CancellationToken.None);
            Assert.Empty(quote.Errors);
            Assert.NotNull(order);
            var db = scope.ServiceProvider.GetRequiredService<Api.Data.AppDbContext>();
            db.Orders.Add(order);
            await db.SaveChangesAsync();
            orderId = order.Id;
        }
        await using (var db = factory.CreateDbContext())
        {
            var latte = await db.Products.SingleAsync(p => p.NameTr == "Latte");
            latte.NameTr = "Latte (yeni)";
            latte.Price = 999m;
            await db.SaveChangesAsync();
        }

        await using (var db = factory.CreateDbContext())
        {
            var saved = await db.Orders.Include(o => o.Items).ThenInclude(i => i.Options).Include(o => o.History)
                .SingleAsync(o => o.Id == orderId);
            Assert.Equal(OrderStatus.PendingPayment, saved.Status);
            Assert.Equal(OrderStatus.PendingPayment, Assert.Single(saved.History).Status);
            var line = Assert.Single(saved.Items);
            Assert.Equal("Latte", line.NameTr);
            Assert.Equal(205m, line.UnitPrice);
            Assert.Equal(410m, line.LineTotal);
            Assert.Equal("Yulaf", line.Options.Single(o => o.PriceDelta > 0).NameTr);
            Assert.Equal(440m, saved.Total);
            Assert.Equal("Bulgurlu", saved.AddressNeighborhood);
            Assert.Equal("Demlik Sk. No:10 D:3", saved.AddressLine);
            Assert.Equal("Zile basmayın", saved.Note);
        }
    }

    [Fact]
    public async Task Quote_endpoint_requires_auth_and_returns_errors_with_200()
    {
        var anonymous = await _app.CreateClient().PostAsJsonAsync("/api/orders/quote",
            new { items = Array.Empty<object>(), fulfilment = "Pickup" });
        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);

        var (_, client) = await Customer();
        var response = await client.PostAsJsonAsync("/api/orders/quote", new { items = Array.Empty<object>(), fulfilment = "Pickup" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("EMPTY_CART", body.GetProperty("errors")[0].GetProperty("code").GetString());
        Assert.False(body.GetProperty("canOrder").GetBoolean());
    }
}
