using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using KahveDurak.Api.Tests.Infrastructure;

namespace KahveDurak.Api.Tests.Auth;

[Collection("postgres")]
public class AuthEndpointTests(ApiFactory factory)
{
    private readonly HttpClient _client = factory.CreateClient();

    private static object Registration(string email, string password = "Sifre-1234") => new
    {
        firstName = "Ali", lastName = "Yılmaz", email, phone = "+90 555 111 2233", password
    };

    private static string UniqueEmail() => $"user-{Guid.NewGuid():N}@example.com";

    private async Task<string> Login(string email, string password)
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login", new { email, password });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("token").GetString()!;
    }

    private async Task<HttpResponseMessage> GetWithToken(string path, string token)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, path);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return await _client.SendAsync(request);
    }

    [Fact]
    public async Task Register_returns_token_and_customer_role()
    {
        var email = UniqueEmail();

        var response = await _client.PostAsJsonAsync("/api/auth/register", Registration(email));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(string.IsNullOrEmpty(body.GetProperty("token").GetString()));
        Assert.Equal("Customer", body.GetProperty("user").GetProperty("role").GetString());
        Assert.Equal(email, body.GetProperty("user").GetProperty("email").GetString());
    }

    [Fact]
    public async Task Register_normalizes_email_and_rejects_duplicate_with_409()
    {
        var local = $"ali-{Guid.NewGuid():N}";

        var first = await _client.PostAsJsonAsync("/api/auth/register", Registration($" {local.ToUpperInvariant()}@X.com "));
        var second = await _client.PostAsJsonAsync("/api/auth/register", Registration($"{local}@x.com"));

        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        var body = await first.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal($"{local}@x.com", body.GetProperty("user").GetProperty("email").GetString());
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    [Fact]
    public async Task Login_with_differently_cased_email_succeeds()
    {
        var email = UniqueEmail();
        await _client.PostAsJsonAsync("/api/auth/register", Registration(email));

        var token = await Login(" " + email.ToUpperInvariant(), "Sifre-1234");

        Assert.False(string.IsNullOrEmpty(token));
    }

    [Fact]
    public async Task Login_with_wrong_password_returns_401()
    {
        var email = UniqueEmail();
        await _client.PostAsJsonAsync("/api/auth/register", Registration(email));

        var wrongPassword = await _client.PostAsJsonAsync("/api/auth/login", new { email, password = "yanlis-sifre" });
        var unknownEmail = await _client.PostAsJsonAsync("/api/auth/login", new { email = UniqueEmail(), password = "Sifre-1234" });

        Assert.Equal(HttpStatusCode.Unauthorized, wrongPassword.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, unknownEmail.StatusCode);
    }

    [Fact]
    public async Task Register_with_short_password_returns_400()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/register", Registration(UniqueEmail(), "1234567"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Me_requires_token()
    {
        var email = UniqueEmail();
        await _client.PostAsJsonAsync("/api/auth/register", Registration(email));
        var token = await Login(email, "Sifre-1234");

        var anonymous = await _client.GetAsync("/api/auth/me");
        var authenticated = await GetWithToken("/api/auth/me", token);

        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);
        Assert.Equal(HttpStatusCode.OK, authenticated.StatusCode);
        var me = await authenticated.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(email, me.GetProperty("email").GetString());
    }

    [Fact]
    public async Task Admin_ping_returns_403_for_customer_and_200_for_admin()
    {
        var email = UniqueEmail();
        await _client.PostAsJsonAsync("/api/auth/register", Registration(email));
        var customerToken = await Login(email, "Sifre-1234");
        var adminToken = await Login(ApiFactory.AdminEmail, ApiFactory.AdminPassword);

        Assert.Equal(HttpStatusCode.Unauthorized, (await _client.GetAsync("/api/admin/ping")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await GetWithToken("/api/admin/ping", customerToken)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await GetWithToken("/api/admin/ping", adminToken)).StatusCode);
    }
}
