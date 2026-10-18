using KahveDurak.Api.Tests.Infrastructure;

namespace KahveDurak.Api.Tests;

[Collection("postgres")]
public class HealthTests(ApiFactory factory)
{
    [Fact]
    public async Task Health_returns_ok()
    {
        var client = factory.CreateClient();

        var response = await client.GetAsync("/health");

        Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("ok", await response.Content.ReadAsStringAsync());
    }
}
