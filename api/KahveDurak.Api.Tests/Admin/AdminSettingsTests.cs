using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using KahveDurak.Api.Tests.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Time.Testing;

namespace KahveDurak.Api.Tests.Admin;

[Collection("postgres")]
public class AdminSettingsTests(ApiFactory factory) : IAsyncLifetime
{
    // Monday 2026-10-19 12:00 Istanbul.
    private readonly FakeTimeProvider _clock = new(new DateTimeOffset(2026, 10, 19, 9, 0, 0, TimeSpan.Zero));
    private WebApplicationFactory<Program> _app = null!;
    private HttpClient _admin = null!;

    public async Task InitializeAsync()
    {
        await factory.ResetDatabaseAsync();
        _app = factory.WithWebHostBuilder(b => b.ConfigureTestServices(s => s.AddSingleton<TimeProvider>(_clock)));
        _admin = await TestData.AdminAsync(factory, _app.CreateClient());
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private async Task<JsonObject> Settings() => (await _admin.GetFromJsonAsync<JsonObject>("/api/admin/settings"))!;

    private Task<HttpResponseMessage> Save(JsonObject settings) => _admin.PutAsJsonAsync("/api/admin/settings", settings);

    private static JsonObject Day(JsonObject settings, int day) =>
        settings["openingHours"]!.AsArray().Select(h => h!.AsObject()).Single(h => (int)h["day"]! == day);

    [Fact]
    public async Task Settings_round_trip_and_public_shop_info_follows()
    {
        var settings = await Settings();
        Assert.Equal(30m, (decimal)settings["deliveryFee"]!);
        Assert.Equal(33, settings["neighborhoods"]!.AsArray().Count);
        settings["deliveryFee"] = 40;
        settings["phone"] = "+90 216 000 00 00";

        Assert.Equal(HttpStatusCode.OK, (await Save(settings)).StatusCode);

        var home = await _app.CreateClient().GetFromJsonAsync<JsonElement>("/api/home");
        Assert.Equal(40m, home.GetProperty("shop").GetProperty("deliveryFee").GetDecimal());
        Assert.Equal("+90 216 000 00 00", home.GetProperty("shop").GetProperty("phone").GetString());
        var (userId, customer) = await TestData.CustomerAsync(factory, _app.CreateClient());
        var addressId = await TestData.AddressAsync(factory, userId);
        object body;
        await using (var db = factory.CreateDbContext())
            body = new { items = new[] { await TestData.ItemAsync(db, "Latte", 2, "Normal", "Small") }, fulfilment = "Delivery", addressId };
        var quote = await (await customer.PostAsJsonAsync("/api/orders/quote", body)).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(40m, quote.GetProperty("deliveryFee").GetDecimal());
    }

    [Theory]
    [InlineData("javascript:alert(1)")]
    [InlineData("https://evil.com/maps?q=x")]
    [InlineData("http://www.google.com/maps?q=x")]
    public async Task Map_url_must_be_google_maps(string url)
    {
        var settings = await Settings();
        settings["mapEmbedUrl"] = url;

        Assert.Equal(HttpStatusCode.BadRequest, (await Save(settings)).StatusCode);
    }

    [Fact]
    public async Task Opening_hours_validation_and_closed_day_applies()
    {
        var settings = await Settings();
        Day(settings, 2)["opens"] = "25:00";
        Assert.Equal(HttpStatusCode.BadRequest, (await Save(settings)).StatusCode);

        settings = await Settings();
        settings["openingHours"]!.AsArray().RemoveAt(0);
        Assert.Equal(HttpStatusCode.BadRequest, (await Save(settings)).StatusCode);

        settings = await Settings();
        Day(settings, 1)["isClosed"] = true; // Monday
        Assert.Equal(HttpStatusCode.OK, (await Save(settings)).StatusCode);
        var status = await _app.CreateClient().GetFromJsonAsync<JsonElement>("/api/shop/status");
        Assert.False(status.GetProperty("isOpen").GetBoolean());
    }

    [Fact]
    public async Task Neighborhood_can_be_switched_off()
    {
        var settings = await Settings();
        var bulgurlu = settings["neighborhoods"]!.AsArray().Select(n => n!.AsObject()).Single(n => (string)n["name"]! == "Bulgurlu");
        bulgurlu["isActive"] = false;

        Assert.Equal(HttpStatusCode.OK, (await Save(settings)).StatusCode);

        var (userId, customer) = await TestData.CustomerAsync(factory, _app.CreateClient());
        var addressId = await TestData.AddressAsync(factory, userId);
        object body;
        await using (var db = factory.CreateDbContext())
            body = new { items = new[] { await TestData.ItemAsync(db, "Latte", 2, "Normal", "Small") }, fulfilment = "Delivery", addressId };
        var quote = await (await customer.PostAsJsonAsync("/api/orders/quote", body)).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Contains(quote.GetProperty("errors").EnumerateArray(), e => e.GetProperty("code").GetString() == "NEIGHBORHOOD_NOT_SERVED");
    }

    [Fact]
    public async Task Unknown_neighborhood_or_negative_fee_is_400()
    {
        var settings = await Settings();
        settings["neighborhoods"]!.AsArray().Add(new JsonObject { ["id"] = 99999, ["name"] = "X", ["isActive"] = true });
        Assert.Equal(HttpStatusCode.BadRequest, (await Save(settings)).StatusCode);

        settings = await Settings();
        settings["deliveryFee"] = -1;
        Assert.Equal(HttpStatusCode.BadRequest, (await Save(settings)).StatusCode);
    }
}
