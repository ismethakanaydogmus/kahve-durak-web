using System.Net.Http.Json;
using System.Text.Json;
using KahveDurak.Api.Tests.Infrastructure;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Time.Testing;

namespace KahveDurak.Api.Tests.Catalog;

[Collection("postgres")]
public class CatalogEndpointTests(ApiFactory factory) : IAsyncLifetime
{
    public Task InitializeAsync() => factory.ResetDatabaseAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    private async Task<JsonElement> GetJson(string path, HttpClient? client = null)
    {
        var response = await (client ?? factory.CreateClient()).GetAsync(path);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    private static IEnumerable<JsonElement> Products(JsonElement menu) =>
        menu.EnumerateArray().SelectMany(c => c.GetProperty("products").EnumerateArray());

    [Fact]
    public async Task Menu_returns_categories_in_order_with_products_and_options()
    {
        var menu = await GetJson("/api/menu");

        var names = menu.EnumerateArray().Select(c => c.GetProperty("nameTr").GetString()).ToList();
        Assert.Equal(["Sıcak İçecekler", "Soğuk Kahveler", "Soğuk İçecekler", "Çaylar"], names);
        Assert.Equal("Hot Drinks", menu[0].GetProperty("nameEn").GetString());

        var espresso = Products(menu).Single(p => p.GetProperty("nameTr").GetString() == "Espresso");
        Assert.Equal(95m, espresso.GetProperty("price").GetDecimal());
        var options = espresso.GetProperty("optionGroups")[0].GetProperty("options").EnumerateArray().ToList();
        var dbl = options.Single(o => o.GetProperty("nameTr").GetString() == "Double");
        Assert.Equal(20m, dbl.GetProperty("priceDelta").GetDecimal());
    }

    [Fact]
    public async Task Menu_hides_deleted_products_but_shows_unavailable()
    {
        await using (var db = factory.CreateDbContext())
        {
            (await db.Products.SingleAsync(p => p.NameTr == "Su")).IsDeleted = true;
            (await db.Products.SingleAsync(p => p.NameTr == "Soda")).IsAvailable = false;
            await db.SaveChangesAsync();
        }

        var products = Products(await GetJson("/api/menu")).ToList();

        Assert.DoesNotContain(products, p => p.GetProperty("nameTr").GetString() == "Su");
        var soda = products.Single(p => p.GetProperty("nameTr").GetString() == "Soda");
        Assert.False(soda.GetProperty("isAvailable").GetBoolean());
    }

    [Fact]
    public async Task Menu_hides_inactive_categories()
    {
        await using (var db = factory.CreateDbContext())
        {
            (await db.Categories.SingleAsync(c => c.NameTr == "Çaylar")).IsActive = false;
            await db.SaveChangesAsync();
        }

        var menu = await GetJson("/api/menu");

        Assert.DoesNotContain(menu.EnumerateArray(), c => c.GetProperty("nameTr").GetString() == "Çaylar");
    }

    [Fact]
    public async Task Home_returns_featured_slides_published_testimonials_and_shop_info()
    {
        var home = await GetJson("/api/home");

        Assert.Equal(6, home.GetProperty("featured").GetArrayLength());
        Assert.Equal(4, home.GetProperty("slides").GetArrayLength());
        Assert.Equal(6, home.GetProperty("testimonials").GetArrayLength());
        Assert.Equal(4, home.GetProperty("categories").GetArrayLength());
        Assert.Equal(0, home.GetProperty("categories")[0].GetProperty("products").GetArrayLength());

        var shop = home.GetProperty("shop");
        Assert.Equal("Kahve Durak", shop.GetProperty("name").GetString());
        Assert.Equal("+90 555 000 0000", shop.GetProperty("phone").GetString());
        Assert.Equal(30m, shop.GetProperty("deliveryFee").GetDecimal());
        Assert.Equal(200m, shop.GetProperty("minOrderAmount").GetDecimal());
        Assert.Equal(7, shop.GetProperty("openingHours").GetArrayLength());
        Assert.Equal("10:00", shop.GetProperty("openingHours")[0].GetProperty("opens").GetString());
        Assert.Equal("03:00", shop.GetProperty("openingHours")[0].GetProperty("closes").GetString());
    }

    [Fact]
    public async Task Home_featured_excludes_unavailable_products()
    {
        await using (var db = factory.CreateDbContext())
        {
            (await db.Products.SingleAsync(p => p.NameTr == "Latte")).IsAvailable = false;
            await db.SaveChangesAsync();
        }

        var home = await GetJson("/api/home");

        var featured = home.GetProperty("featured").EnumerateArray().Select(p => p.GetProperty("nameTr").GetString()).ToList();
        Assert.DoesNotContain("Latte", featured);
        Assert.Equal(5, featured.Count);
    }

    [Fact]
    public void App_fails_to_start_without_jwt_secret()
    {
        var misconfigured = factory.WithWebHostBuilder(b => b.UseSetting("Jwt:Secret", ""));

        var error = Assert.ThrowsAny<Exception>(() => misconfigured.CreateClient());

        Assert.Contains("Jwt:Secret", error.ToString());
    }

    [Fact]
    public async Task Shop_status_is_open_at_0130_istanbul()
    {
        // Tuesday 2026-10-20 01:30 Istanbul = Monday 22:30 UTC.
        var clock = new FakeTimeProvider(new DateTimeOffset(2026, 10, 19, 22, 30, 0, TimeSpan.Zero));
        var client = factory.WithWebHostBuilder(b =>
            b.ConfigureTestServices(s => s.AddSingleton<TimeProvider>(clock))).CreateClient();

        var status = await GetJson("/api/shop/status", client);

        Assert.True(status.GetProperty("isOpen").GetBoolean());
        Assert.Equal(new DateTimeOffset(2026, 10, 20, 0, 0, 0, TimeSpan.Zero), status.GetProperty("closesAt").GetDateTimeOffset());
        Assert.Equal(JsonValueKind.Null, status.GetProperty("nextOpensAt").ValueKind);
    }
}
