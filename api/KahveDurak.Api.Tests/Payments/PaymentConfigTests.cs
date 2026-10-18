using KahveDurak.Api.Tests.Infrastructure;
using Microsoft.AspNetCore.Hosting;

namespace KahveDurak.Api.Tests.Payments;

[Collection("postgres")]
public class PaymentConfigTests(ApiFactory factory)
{
    private static Action<IWebHostBuilder> Production(string apiPublicUrl, string frontendUrl) => b =>
    {
        b.UseEnvironment("Production");
        b.UseSetting("Payments:Provider", "Iyzico");
        b.UseSetting("Iyzico:ApiKey", "key");
        b.UseSetting("Iyzico:SecretKey", "secret");
        b.UseSetting("Payments:ApiPublicUrl", apiPublicUrl);
        b.UseSetting("Payments:FrontendUrl", frontendUrl);
        b.UseSetting("Storage:Provider", "Supabase");
        b.UseSetting("Storage:SupabaseUrl", "https://abc.supabase.co");
        b.UseSetting("Storage:SupabaseServiceKey", "k");
    };

    [Theory]
    [InlineData("", "https://kahvedurak.example")]
    [InlineData("/relative", "https://kahvedurak.example")]
    [InlineData("https://api.example", "")]
    [InlineData("http://api.example", "https://kahvedurak.example")]
    public void Production_requires_absolute_https_payment_urls(string apiPublicUrl, string frontendUrl)
    {
        var app = factory.WithWebHostBuilder(Production(apiPublicUrl, frontendUrl));

        var error = Assert.ThrowsAny<Exception>(() => app.CreateClient());

        Assert.Contains("Payments:", error.ToString());
    }

    [Fact]
    public void Production_starts_with_valid_payment_urls()
    {
        var app = factory.WithWebHostBuilder(Production("https://api.example", "https://kahvedurak.example"));

        using var client = app.CreateClient();

        Assert.NotNull(client);
    }
}
