using System.Net.Http.Json;
using KahveDurak.Api.Features.Payments;
using KahveDurak.Api.Tests.Infrastructure;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Time.Testing;

namespace KahveDurak.Api.Tests.Payments;

/// <summary>Behind Render's proxy the buyer IP sent to iyzico must be the customer's, not the proxy's.</summary>
[Collection("postgres")]
public class ForwardedHeadersTests(ApiFactory factory) : IAsyncLifetime
{
    private sealed class RecordingGateway : IPaymentGateway
    {
        public PaymentInitRequest? Last;

        public Task<PaymentInitResult> InitializeAsync(PaymentInitRequest request, CancellationToken ct)
        {
            Last = request;
            return Task.FromResult(new PaymentInitResult(true, Guid.NewGuid().ToString("N"), "https://pay.test", null));
        }

        public Task<PaymentResult> RetrieveAsync(string token, CancellationToken ct) =>
            Task.FromResult(new PaymentResult(false, null, null, null, "n/a"));
    }

    private readonly FakeTimeProvider _clock = new(new DateTimeOffset(2026, 10, 19, 9, 0, 0, TimeSpan.Zero));
    private readonly RecordingGateway _gateway = new();

    public Task InitializeAsync() => factory.ResetDatabaseAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    private WebApplicationFactory<Program> App(bool trustProxy) => factory.WithWebHostBuilder(b =>
    {
        b.UseSetting("Proxy:TrustForwardedHeaders", trustProxy ? "true" : "false");
        b.ConfigureTestServices(s =>
        {
            s.AddSingleton<TimeProvider>(_clock);
            s.AddSingleton<IPaymentGateway>(_gateway);
        });
    });

    private async Task PlaceOrder(WebApplicationFactory<Program> app, string forwardedFor)
    {
        var (_, client) = await TestData.CustomerAsync(factory, app.CreateClient());
        object body;
        await using (var db = factory.CreateDbContext())
            body = new { items = new[] { await TestData.ItemAsync(db, "Su", 1) }, fulfilment = "Pickup" };
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/orders") { Content = JsonContent.Create(body) };
        request.Headers.Add("X-Forwarded-For", forwardedFor);
        request.Headers.Authorization = client.DefaultRequestHeaders.Authorization;
        (await client.SendAsync(request)).EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task Behind_a_trusted_proxy_the_customer_ip_reaches_iyzico()
    {
        await PlaceOrder(App(trustProxy: true), "203.0.113.7");

        Assert.Equal("203.0.113.7", _gateway.Last!.BuyerIp);
    }

    [Fact]
    public async Task Without_a_proxy_a_spoofed_header_is_ignored()
    {
        await PlaceOrder(App(trustProxy: false), "203.0.113.7");

        Assert.NotEqual("203.0.113.7", _gateway.Last!.BuyerIp);
    }
}
