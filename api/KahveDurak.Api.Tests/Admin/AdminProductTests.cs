using System.Net;
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
public class AdminProductTests(ApiFactory factory) : IAsyncLifetime
{
    // Monday 12:00 Istanbul, so quotes are allowed.
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

    private async Task<int> CategoryId(string name)
    {
        await using var db = factory.CreateDbContext();
        return (await db.Categories.SingleAsync(c => c.NameTr == name)).Id;
    }

    private async Task<JsonElement> AdminProduct(string name) =>
        (await _admin.GetFromJsonAsync<JsonElement>("/api/admin/catalog")).EnumerateArray()
            .SelectMany(c => c.GetProperty("products").EnumerateArray())
            .Single(p => p.GetProperty("nameTr").GetString() == name);

    /// <summary>Turns a catalog product back into an update body, applying <paramref name="edit"/> to its groups.</summary>
    private static object Body(JsonElement p, Func<List<Dictionary<string, object?>>, List<Dictionary<string, object?>>>? edit = null)
    {
        var groups = p.GetProperty("optionGroups").EnumerateArray().Select(g => new Dictionary<string, object?>
        {
            ["id"] = g.GetProperty("id").GetInt32(),
            ["nameTr"] = g.GetProperty("nameTr").GetString(),
            ["nameEn"] = g.GetProperty("nameEn").GetString(),
            ["isRequired"] = g.GetProperty("isRequired").GetBoolean(),
            ["maxSelect"] = g.GetProperty("maxSelect").GetInt32(),
            ["options"] = g.GetProperty("options").EnumerateArray().Select(o => new Dictionary<string, object?>
            {
                ["id"] = o.GetProperty("id").GetInt32(),
                ["nameTr"] = o.GetProperty("nameTr").GetString(),
                ["nameEn"] = o.GetProperty("nameEn").GetString(),
                ["priceDelta"] = o.GetProperty("priceDelta").GetDecimal(),
            }).ToList(),
        }).ToList();
        return new
        {
            categoryId = p.GetProperty("categoryId").GetInt32(), nameTr = p.GetProperty("nameTr").GetString(),
            nameEn = p.GetProperty("nameEn").GetString(), descriptionTr = p.GetProperty("descriptionTr").GetString(),
            price = p.GetProperty("price").GetDecimal(), isAvailable = true, isFeatured = p.GetProperty("isFeatured").GetBoolean(),
            optionGroups = edit is null ? groups : edit(groups),
        };
    }

    private static List<Dictionary<string, object?>> Options(Dictionary<string, object?> group) => (List<Dictionary<string, object?>>)group["options"]!;

    private async Task<QuoteDto> QuoteAs(HttpClient customer, CheckoutItemRequest item)
    {
        var response = await customer.PostAsJsonAsync("/api/orders/quote", new { items = new[] { item }, fulfilment = "Pickup" });
        return (await response.Content.ReadFromJsonAsync<QuoteDto>(new JsonSerializerOptions(JsonSerializerDefaults.Web)
        {
            Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() },
        }))!;
    }

    [Fact]
    public async Task Create_product_with_option_groups_appears_on_menu_and_is_orderable()
    {
        var response = await _admin.PostAsJsonAsync("/api/admin/products", new
        {
            categoryId = await CategoryId("Soğuk Kahveler"), nameTr = "Iced Caramel Latte", nameEn = "Iced Caramel Latte",
            descriptionTr = "Karamelli buzlu latte.", price = 215m, isAvailable = true, isFeatured = false,
            optionGroups = new[]
            {
                new { nameTr = "Şurup", nameEn = "Syrup", isRequired = false, maxSelect = 2, options = new[]
                {
                    new { nameTr = "Karamel", nameEn = "Caramel", priceDelta = 15m },
                    new { nameTr = "Vanilya", nameEn = "Vanilla", priceDelta = 15m },
                } },
            },
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("id").GetInt32();
        var optionIds = created.GetProperty("optionGroups")[0].GetProperty("options").EnumerateArray().Select(o => o.GetProperty("id").GetInt32()).ToArray();

        var menu = await _app.CreateClient().GetFromJsonAsync<JsonElement>("/api/menu");
        var iced = menu.EnumerateArray().Single(c => c.GetProperty("nameTr").GetString() == "Soğuk Kahveler").GetProperty("products");
        Assert.Equal("Iced Caramel Latte", iced[iced.GetArrayLength() - 1].GetProperty("nameTr").GetString());

        var (_, customer) = await TestData.CustomerAsync(factory, _app.CreateClient());
        var quote = await QuoteAs(customer, new CheckoutItemRequest(id, optionIds, 1));
        Assert.Empty(quote.Errors);
        Assert.Equal(245m, quote.Total);
    }

    [Fact]
    public async Task Update_keeps_ids_of_existing_options()
    {
        var latte = await AdminProduct("Latte");
        var oatId = latte.GetProperty("optionGroups")[0].GetProperty("options").EnumerateArray()
            .Single(o => o.GetProperty("nameTr").GetString() == "Yulaf").GetProperty("id").GetInt32();
        CheckoutItemRequest oldCart;
        await using (var db = factory.CreateDbContext()) oldCart = await TestData.ItemAsync(db, "Latte", 1, "Yulaf", "Small");

        var response = await _admin.PutAsJsonAsync($"/api/admin/products/{latte.GetProperty("id").GetInt32()}", Body(latte, groups =>
        {
            Options(groups[0]).Single(o => (string?)o["nameTr"] == "Yulaf")["priceDelta"] = 35m;
            return groups;
        }));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await AdminProduct("Latte");
        Assert.Equal(oatId, updated.GetProperty("optionGroups")[0].GetProperty("options").EnumerateArray()
            .Single(o => o.GetProperty("nameTr").GetString() == "Yulaf").GetProperty("id").GetInt32());
        var (_, customer) = await TestData.CustomerAsync(factory, _app.CreateClient());
        var quote = await QuoteAs(customer, oldCart);
        Assert.Empty(quote.Errors);
        Assert.Equal(210m, quote.Lines.Single().UnitPrice);
    }

    [Fact]
    public async Task Removed_option_makes_old_cart_line_invalid()
    {
        var latte = await AdminProduct("Latte");
        CheckoutItemRequest oldCart;
        await using (var db = factory.CreateDbContext()) oldCart = await TestData.ItemAsync(db, "Latte", 1, "Yulaf", "Small");

        await _admin.PutAsJsonAsync($"/api/admin/products/{latte.GetProperty("id").GetInt32()}", Body(latte, groups =>
        {
            Options(groups[0]).RemoveAll(o => (string?)o["nameTr"] == "Yulaf");
            return groups;
        }));

        var (_, customer) = await TestData.CustomerAsync(factory, _app.CreateClient());
        Assert.Contains((await QuoteAs(customer, oldCart)).Errors, e => e.Code == "OPTION_INVALID");
    }

    [Fact]
    public async Task Option_id_from_another_product_is_400()
    {
        var latte = await AdminProduct("Latte");
        var espressoOption = (await AdminProduct("Espresso")).GetProperty("optionGroups")[0].GetProperty("options")[0].GetProperty("id").GetInt32();

        var response = await _admin.PutAsJsonAsync($"/api/admin/products/{latte.GetProperty("id").GetInt32()}", Body(latte, groups =>
        {
            Options(groups[0])[0]["id"] = espressoOption;
            return groups;
        }));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Price_must_be_positive_and_deltas_non_negative()
    {
        var latte = await AdminProduct("Latte");
        var id = latte.GetProperty("id").GetInt32();
        var json = JsonSerializer.SerializeToElement(Body(latte), new JsonSerializerOptions(JsonSerializerDefaults.Web));
        var zeroPrice = JsonSerializer.Deserialize<Dictionary<string, object?>>(json.GetRawText())!;
        zeroPrice["price"] = 0;

        Assert.Equal(HttpStatusCode.BadRequest, (await _admin.PutAsJsonAsync($"/api/admin/products/{id}", zeroPrice)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await _admin.PutAsJsonAsync($"/api/admin/products/{id}", Body(latte, groups =>
        {
            Options(groups[0])[0]["priceDelta"] = -5m;
            return groups;
        }))).StatusCode);
    }

    [Fact]
    public async Task Single_choice_group_must_have_max_select_1_and_group_needs_an_option()
    {
        var latte = await AdminProduct("Latte");
        var id = latte.GetProperty("id").GetInt32();

        Assert.Equal(HttpStatusCode.BadRequest, (await _admin.PutAsJsonAsync($"/api/admin/products/{id}", Body(latte, groups =>
        {
            groups[0]["maxSelect"] = 0;
            return groups;
        }))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await _admin.PutAsJsonAsync($"/api/admin/products/{id}", Body(latte, groups =>
        {
            Options(groups[0]).Clear();
            return groups;
        }))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await _admin.PutAsJsonAsync($"/api/admin/products/{id}", Body(latte, groups =>
        {
            groups[0]["maxSelect"] = 9; // more than its 3 options
            return groups;
        }))).StatusCode);
    }

    [Fact]
    public async Task Availability_toggle_shows_sold_out_on_menu()
    {
        var id = (await AdminProduct("Mocha")).GetProperty("id").GetInt32();

        var response = await _admin.PatchAsJsonAsync($"/api/admin/products/{id}/availability", new { isAvailable = false });

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var menu = await _app.CreateClient().GetFromJsonAsync<JsonElement>("/api/menu");
        var mocha = menu.EnumerateArray().SelectMany(c => c.GetProperty("products").EnumerateArray()).Single(p => p.GetProperty("id").GetInt32() == id);
        Assert.False(mocha.GetProperty("isAvailable").GetBoolean());
    }

    [Fact]
    public async Task Deleted_product_leaves_menu_but_past_order_detail_unchanged()
    {
        var (_, customer) = await TestData.CustomerAsync(factory, _app.CreateClient());
        var order = await PaymentCallbackTests.PlaceOrderAsync(factory, customer);
        await AdminOrdersEndpointTests.PayAsync(_app, order.Token);
        var latteId = (await AdminProduct("Latte")).GetProperty("id").GetInt32();

        Assert.Equal(HttpStatusCode.NoContent, (await _admin.DeleteAsync($"/api/admin/products/{latteId}")).StatusCode);

        var menu = await _app.CreateClient().GetFromJsonAsync<JsonElement>("/api/menu");
        Assert.DoesNotContain(menu.EnumerateArray().SelectMany(c => c.GetProperty("products").EnumerateArray()), p => p.GetProperty("id").GetInt32() == latteId);
        var detail = await customer.GetFromJsonAsync<JsonElement>($"/api/orders/{order.OrderId}");
        Assert.Equal("Latte", detail.GetProperty("items")[0].GetProperty("nameTr").GetString());
        Assert.Equal(175m, detail.GetProperty("items")[0].GetProperty("unitPrice").GetDecimal());
    }

    [Fact]
    public async Task Reorder_products_within_category()
    {
        var teaCategory = await CategoryId("Çaylar");
        var teas = (await _admin.GetFromJsonAsync<JsonElement>("/api/admin/catalog")).EnumerateArray()
            .Single(c => c.GetProperty("id").GetInt32() == teaCategory).GetProperty("products").EnumerateArray()
            .Select(p => p.GetProperty("id").GetInt32()).Reverse().ToArray();

        Assert.Equal(HttpStatusCode.NoContent, (await _admin.PostAsJsonAsync("/api/admin/products/reorder", new { categoryId = teaCategory, ids = teas })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await _admin.PostAsJsonAsync("/api/admin/products/reorder", new { categoryId = teaCategory, ids = teas[..1] })).StatusCode);

        var menu = await _app.CreateClient().GetFromJsonAsync<JsonElement>("/api/menu");
        var order = menu.EnumerateArray().Single(c => c.GetProperty("id").GetInt32() == teaCategory).GetProperty("products").EnumerateArray()
            .Select(p => p.GetProperty("id").GetInt32()).ToArray();
        Assert.Equal(teas, order);
    }
}
