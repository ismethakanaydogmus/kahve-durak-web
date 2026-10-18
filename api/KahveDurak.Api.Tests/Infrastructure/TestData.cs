using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using KahveDurak.Api.Data;
using KahveDurak.Api.Data.Entities;
using KahveDurak.Api.Features.Orders;
using Microsoft.EntityFrameworkCore;

namespace KahveDurak.Api.Tests.Infrastructure;

public static class TestData
{
    /// <summary>Registers a fresh customer and returns their id and an authenticated client.</summary>
    public static async Task<(int UserId, HttpClient Client)> CustomerAsync(ApiFactory factory, HttpClient? client = null)
    {
        client ??= factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/register", new
        {
            firstName = "Ayşe", lastName = "Demir", email = $"c-{Guid.NewGuid():N}@example.com",
            phone = "+905551112233", password = "Sifre-1234"
        });
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", body.GetProperty("token").GetString());
        return (body.GetProperty("user").GetProperty("id").GetInt32(), client);
    }

    /// <summary>A client logged in as the seeded admin.</summary>
    public static async Task<HttpClient> AdminAsync(ApiFactory factory, HttpClient? client = null)
    {
        client ??= factory.CreateClient();
        var token = await HubClient.LoginAsync(client, ApiFactory.AdminEmail, ApiFactory.AdminPassword);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    /// <summary>Adds an address for the user directly in the database.</summary>
    public static async Task<int> AddressAsync(ApiFactory factory, int userId, string neighborhood = "Bulgurlu")
    {
        await using var db = factory.CreateDbContext();
        var n = await db.DeliveryNeighborhoods.SingleAsync(x => x.Name == neighborhood);
        var address = new Address { UserId = userId, Title = "Ev", NeighborhoodId = n.Id, Line = "Demlik Sk. No:10 D:3" };
        db.Addresses.Add(address);
        await db.SaveChangesAsync();
        return address.Id;
    }

    /// <summary>A cart line for the seeded product with the named options (option names are TR, scoped to that product).</summary>
    public static async Task<CheckoutItemRequest> ItemAsync(AppDbContext db, string product, int quantity, params string[] options)
    {
        var p = await db.Products.IgnoreQueryFilters().Include(x => x.OptionGroups).ThenInclude(g => g.Options)
            .SingleAsync(x => x.NameTr == product);
        var ids = options.Select(o => p.OptionGroups.SelectMany(g => g.Options).Single(x => x.NameTr == o).Id).ToArray();
        return new CheckoutItemRequest(p.Id, ids, quantity);
    }
}
