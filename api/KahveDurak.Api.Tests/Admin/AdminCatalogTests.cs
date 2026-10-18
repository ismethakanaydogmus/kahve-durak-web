using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using KahveDurak.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KahveDurak.Api.Tests.Admin;

[Collection("postgres")]
public partial class AdminCatalogTests(ApiFactory factory) : IAsyncLifetime
{
    private HttpClient _admin = null!;

    public async Task InitializeAsync()
    {
        await factory.ResetDatabaseAsync();
        _admin = await TestData.AdminAsync(factory);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private async Task<JsonElement> Catalog() => await _admin.GetFromJsonAsync<JsonElement>("/api/admin/catalog");

    private async Task<string[]> PublicCategoryNames() =>
        (await factory.CreateClient().GetFromJsonAsync<JsonElement>("/api/menu"))
            .EnumerateArray().Select(c => c.GetProperty("nameTr").GetString()!).ToArray();

    private async Task<int> CategoryId(string name)
    {
        await using var db = factory.CreateDbContext();
        return (await db.Categories.SingleAsync(c => c.NameTr == name)).Id;
    }

    [Fact]
    public async Task Customer_gets_403()
    {
        var (_, customer) = await TestData.CustomerAsync(factory);

        Assert.Equal(HttpStatusCode.Forbidden, (await customer.GetAsync("/api/admin/catalog")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await customer.PostAsJsonAsync("/api/admin/categories", new { nameTr = "X", isActive = true })).StatusCode);
    }

    [Fact]
    public async Task Catalog_includes_inactive_categories_and_sold_out_products_but_not_deleted()
    {
        await using (var db = factory.CreateDbContext())
        {
            (await db.Categories.SingleAsync(c => c.NameTr == "Çaylar")).IsActive = false;
            (await db.Products.SingleAsync(p => p.NameTr == "Soda")).IsAvailable = false;
            (await db.Products.SingleAsync(p => p.NameTr == "Su")).IsDeleted = true;
            await db.SaveChangesAsync();
        }

        var catalog = await Catalog();
        var categories = catalog.EnumerateArray().ToList();
        var products = categories.SelectMany(c => c.GetProperty("products").EnumerateArray()).ToList();

        Assert.Equal(4, categories.Count);
        Assert.False(categories.Single(c => c.GetProperty("nameTr").GetString() == "Çaylar").GetProperty("isActive").GetBoolean());
        Assert.False(products.Single(p => p.GetProperty("nameTr").GetString() == "Soda").GetProperty("isAvailable").GetBoolean());
        Assert.DoesNotContain(products, p => p.GetProperty("nameTr").GetString() == "Su");
        var latte = products.Single(p => p.GetProperty("nameTr").GetString() == "Latte");
        Assert.True(latte.GetProperty("optionGroups")[0].GetProperty("isRequired").GetBoolean());
    }

    [Fact]
    public async Task Create_update_category_and_it_shows_on_public_menu_when_active()
    {
        var created = await _admin.PostAsJsonAsync("/api/admin/categories", new { nameTr = "Tatlılar", nameEn = "Desserts", isActive = false });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var id = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
        Assert.DoesNotContain("Tatlılar", await PublicCategoryNames());

        var updated = await _admin.PutAsJsonAsync($"/api/admin/categories/{id}", new { nameTr = "Tatlılar", nameEn = "Desserts", isActive = true });

        Assert.Equal(HttpStatusCode.OK, updated.StatusCode);
        Assert.Equal("Tatlılar", (await PublicCategoryNames()).Last());
        Assert.Equal(HttpStatusCode.NotFound, (await _admin.PutAsJsonAsync("/api/admin/categories/99999", new { nameTr = "X", isActive = true })).StatusCode);
    }

    [Fact]
    public async Task Category_name_is_required_and_limited_to_60()
    {
        Assert.Equal(HttpStatusCode.BadRequest, (await _admin.PostAsJsonAsync("/api/admin/categories", new { nameTr = "", isActive = true })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await _admin.PostAsJsonAsync("/api/admin/categories", new { nameTr = new string('a', 61), isActive = true })).StatusCode);
    }

    [Fact]
    public async Task Deleting_category_with_products_is_409_and_empty_one_is_204()
    {
        var withProducts = await _admin.DeleteAsync($"/api/admin/categories/{await CategoryId("Çaylar")}");
        Assert.Equal(HttpStatusCode.Conflict, withProducts.StatusCode);
        Assert.Contains("ürün var", await withProducts.Content.ReadAsStringAsync());

        var created = await _admin.PostAsJsonAsync("/api/admin/categories", new { nameTr = "Boş", isActive = true });
        var id = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
        Assert.Equal(HttpStatusCode.NoContent, (await _admin.DeleteAsync($"/api/admin/categories/{id}")).StatusCode);
        Assert.DoesNotContain("Boş", await PublicCategoryNames());
    }

    [Fact]
    public async Task Reorder_sets_menu_order()
    {
        var ids = new[] { await CategoryId("Çaylar"), await CategoryId("Sıcak İçecekler"), await CategoryId("Soğuk İçecekler"), await CategoryId("Soğuk Kahveler") };

        var response = await _admin.PostAsJsonAsync("/api/admin/categories/reorder", new { ids });

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(["Çaylar", "Sıcak İçecekler", "Soğuk İçecekler", "Soğuk Kahveler"], await PublicCategoryNames());
    }

    [Fact]
    public async Task Reorder_with_missing_or_duplicate_ids_is_400()
    {
        var tea = await CategoryId("Çaylar");
        var hot = await CategoryId("Sıcak İçecekler");

        Assert.Equal(HttpStatusCode.BadRequest, (await _admin.PostAsJsonAsync("/api/admin/categories/reorder", new { ids = new[] { tea, hot } })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await _admin.PostAsJsonAsync("/api/admin/categories/reorder", new { ids = new[] { tea, tea, hot, hot } })).StatusCode);
    }
}
