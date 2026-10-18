using System.Net;
using KahveDurak.Api.Tests.Infrastructure;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Time.Testing;

namespace KahveDurak.Api.Tests.Auth;

[Collection("postgres")]
public class TokenLifetimeTests(ApiFactory factory)
{
    [Fact]
    public async Task Token_is_accepted_for_7_days_and_rejected_after()
    {
        var clock = new FakeTimeProvider(new DateTimeOffset(2026, 10, 19, 9, 0, 0, TimeSpan.Zero));
        var app = factory.WithWebHostBuilder(b => b.ConfigureTestServices(s => s.AddSingleton<TimeProvider>(clock)));
        var (_, client) = await TestData.CustomerAsync(factory, app.CreateClient());

        clock.Advance(TimeSpan.FromDays(6));
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/auth/me")).StatusCode);

        clock.Advance(TimeSpan.FromDays(1) + TimeSpan.FromMinutes(10));
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);
    }
}

[Collection("postgres")]
public class TokenWithoutExpiryTests(ApiFactory factory)
{
    [Fact]
    public async Task Token_without_exp_is_rejected()
    {
        var handler = new Microsoft.IdentityModel.JsonWebTokens.JsonWebTokenHandler { SetDefaultTimesOnTokenCreation = false };
        var token = handler.CreateToken(new Microsoft.IdentityModel.Tokens.SecurityTokenDescriptor
        {
            Issuer = "kahvedurak-api",
            Audience = "kahvedurak-api",
            Subject = new System.Security.Claims.ClaimsIdentity([new System.Security.Claims.Claim("sub", "1")]),
            SigningCredentials = new Microsoft.IdentityModel.Tokens.SigningCredentials(
                new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(new string('x', 64))),
                Microsoft.IdentityModel.Tokens.SecurityAlgorithms.HmacSha256),
        });
        Assert.DoesNotContain("exp", System.Text.Encoding.UTF8.GetString(Microsoft.IdentityModel.Tokens.Base64UrlEncoder.DecodeBytes(token.Split('.')[1])));
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var response = await client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
