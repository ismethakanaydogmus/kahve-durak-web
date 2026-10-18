using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using KahveDurak.Api.Tests.Infrastructure;

namespace KahveDurak.Api.Tests.Admin;

[Collection("postgres")]
public class AdminContentTests(ApiFactory factory) : IAsyncLifetime
{
    private HttpClient _admin = null!;

    public async Task InitializeAsync()
    {
        await factory.ResetDatabaseAsync();
        _admin = await TestData.AdminAsync(factory);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private Task<JsonElement> Home() => factory.CreateClient().GetFromJsonAsync<JsonElement>("/api/home");

    private static object Slide(string title, string? link = "/menu", bool active = true) => new
    {
        titleTr = title, titleEn = title, subtitleTr = "Alt yazı", imageUrl = "http://localhost/uploads/x.png", linkUrl = link, isActive = active,
    };

    [Fact]
    public async Task Slides_crud_and_order_show_on_home()
    {
        var created = await _admin.PostAsJsonAsync("/api/admin/slides", Slide("Yeni sezon"));
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var id = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();

        var all = (await _admin.GetFromJsonAsync<JsonElement>("/api/admin/slides")).EnumerateArray().Select(s => s.GetProperty("id").GetInt32()).ToList();
        Assert.Equal(id, all.Last());
        var reordered = new[] { id }.Concat(all.Where(x => x != id)).ToArray();
        Assert.Equal(HttpStatusCode.NoContent, (await _admin.PostAsJsonAsync("/api/admin/slides/reorder", new { ids = reordered })).StatusCode);
        Assert.Equal("Yeni sezon", (await Home()).GetProperty("slides")[0].GetProperty("titleTr").GetString());

        Assert.Equal(HttpStatusCode.OK, (await _admin.PutAsJsonAsync($"/api/admin/slides/{id}", Slide("Yeni sezon", active: false))).StatusCode);
        Assert.DoesNotContain((await Home()).GetProperty("slides").EnumerateArray(), s => s.GetProperty("id").GetInt32() == id);

        Assert.Equal(HttpStatusCode.NoContent, (await _admin.DeleteAsync($"/api/admin/slides/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _admin.DeleteAsync($"/api/admin/slides/{id}")).StatusCode);
    }

    [Theory]
    [InlineData("https://evil.com")]
    [InlineData("//evil.com")]
    [InlineData("javascript:alert(1)")]
    public async Task Slide_link_must_stay_on_site(string link)
    {
        Assert.Equal(HttpStatusCode.BadRequest, (await _admin.PostAsJsonAsync("/api/admin/slides", Slide("X", link))).StatusCode);
    }

    [Fact]
    public async Task Slide_needs_image_and_title()
    {
        var noImage = await _admin.PostAsJsonAsync("/api/admin/slides", new { titleTr = "X", imageUrl = "", isActive = true });
        var noTitle = await _admin.PostAsJsonAsync("/api/admin/slides", new { titleTr = "", imageUrl = "http://localhost/uploads/x.png", isActive = true });

        Assert.Equal(HttpStatusCode.BadRequest, noImage.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, noTitle.StatusCode);
    }

    [Fact]
    public async Task Testimonials_crud_and_unpublished_hidden_from_home()
    {
        var created = await _admin.PostAsJsonAsync("/api/admin/testimonials", new { authorName = "Can B.", text = "Harika!", rating = 5, isPublished = true });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var id = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
        Assert.Contains((await Home()).GetProperty("testimonials").EnumerateArray(), t => t.GetProperty("id").GetInt32() == id);

        await _admin.PutAsJsonAsync($"/api/admin/testimonials/{id}", new { authorName = "Can B.", text = "Harika!", rating = 5, isPublished = false });

        Assert.DoesNotContain((await Home()).GetProperty("testimonials").EnumerateArray(), t => t.GetProperty("id").GetInt32() == id);
        Assert.Contains((await _admin.GetFromJsonAsync<JsonElement>("/api/admin/testimonials")).EnumerateArray(), t => t.GetProperty("id").GetInt32() == id);
        Assert.Equal(HttpStatusCode.NoContent, (await _admin.DeleteAsync($"/api/admin/testimonials/{id}")).StatusCode);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(6)]
    public async Task Rating_must_be_1_to_5(int rating)
    {
        var response = await _admin.PostAsJsonAsync("/api/admin/testimonials", new { authorName = "A", text = "B", rating, isPublished = true });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Customer_gets_403()
    {
        var (_, customer) = await TestData.CustomerAsync(factory);

        Assert.Equal(HttpStatusCode.Forbidden, (await customer.GetAsync("/api/admin/slides")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await customer.GetAsync("/api/admin/settings")).StatusCode);
    }
}
