using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using KahveDurak.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KahveDurak.Api.Tests.Addresses;

[Collection("postgres")]
public class AddressesEndpointTests(ApiFactory factory) : IAsyncLifetime
{
    public Task InitializeAsync() => factory.ResetDatabaseAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    private async Task<int> NeighborhoodId(string name)
    {
        await using var db = factory.CreateDbContext();
        return (await db.DeliveryNeighborhoods.SingleAsync(n => n.Name == name)).Id;
    }

    private async Task<object> Body(string neighborhood = "Bulgurlu", string title = "Ev") => new
    {
        title, neighborhoodId = await NeighborhoodId(neighborhood), line = "Demlik Sk. No:10 D:3", directions = "Fırının yanı"
    };

    [Fact]
    public async Task Neighborhoods_are_sorted_turkish_and_only_active()
    {
        await using (var db = factory.CreateDbContext())
        {
            (await db.DeliveryNeighborhoods.SingleAsync(n => n.Name == "Kuzguncuk")).IsActive = false;
            await db.SaveChangesAsync();
        }

        var list = await factory.CreateClient().GetFromJsonAsync<JsonElement>("/api/shop/neighborhoods");
        var names = list.EnumerateArray().Select(n => n.GetProperty("name").GetString()!).ToList();

        Assert.Equal("Acıbadem", names[0]);
        Assert.True(names.IndexOf("Çengelköy") > names.IndexOf("Cumhuriyet"));
        Assert.True(names.IndexOf("İcadiye") > names.IndexOf("Güzeltepe"));
        Assert.DoesNotContain("Kuzguncuk", names);
        Assert.Equal(32, names.Count);
    }

    [Fact]
    public async Task Customer_can_create_list_update_and_delete_own_address()
    {
        var (_, client) = await TestData.CustomerAsync(factory);

        var created = await client.PostAsJsonAsync("/api/addresses", await Body());
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var address = await created.Content.ReadFromJsonAsync<JsonElement>();
        var id = address.GetProperty("id").GetInt32();
        Assert.Equal("Bulgurlu", address.GetProperty("neighborhoodName").GetString());

        var updated = await client.PutAsJsonAsync($"/api/addresses/{id}", await Body("Ünalan", "İş"));
        Assert.Equal(HttpStatusCode.OK, updated.StatusCode);

        var list = await client.GetFromJsonAsync<JsonElement>("/api/addresses");
        var only = Assert.Single(list.EnumerateArray());
        Assert.Equal("İş", only.GetProperty("title").GetString());
        Assert.Equal("Ünalan", only.GetProperty("neighborhoodName").GetString());

        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/addresses/{id}")).StatusCode);
        Assert.Empty((await client.GetFromJsonAsync<JsonElement>("/api/addresses")).EnumerateArray());
    }

    [Fact]
    public async Task Other_users_address_is_404_for_update_and_delete()
    {
        var (ownerId, _) = await TestData.CustomerAsync(factory);
        var addressId = await TestData.AddressAsync(factory, ownerId);
        var (_, stranger) = await TestData.CustomerAsync(factory);

        Assert.Equal(HttpStatusCode.NotFound, (await stranger.PutAsJsonAsync($"/api/addresses/{addressId}", await Body())).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await stranger.DeleteAsync($"/api/addresses/{addressId}")).StatusCode);
        Assert.Empty((await stranger.GetFromJsonAsync<JsonElement>("/api/addresses")).EnumerateArray());
    }

    [Fact]
    public async Task Address_with_inactive_neighborhood_is_400()
    {
        await using (var db = factory.CreateDbContext())
        {
            (await db.DeliveryNeighborhoods.SingleAsync(n => n.Name == "Kuzguncuk")).IsActive = false;
            await db.SaveChangesAsync();
        }
        var (_, client) = await TestData.CustomerAsync(factory);

        var response = await client.PostAsJsonAsync("/api/addresses", await Body("Kuzguncuk"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Address_with_too_short_line_is_400()
    {
        var (_, client) = await TestData.CustomerAsync(factory);

        var response = await client.PostAsJsonAsync("/api/addresses", new { title = "Ev", neighborhoodId = await NeighborhoodId("Bulgurlu"), line = "No:1" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Address_requires_auth()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await factory.CreateClient().GetAsync("/api/addresses")).StatusCode);
    }
}
