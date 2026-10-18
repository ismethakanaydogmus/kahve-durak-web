using System.Collections.Concurrent;
using Microsoft.Extensions.Options;

namespace KahveDurak.Api.Features.Payments;

/// <summary>Development/test stand-in for iyzico. Its payment page is served by PaymentsController.</summary>
public class FakePaymentGateway(IOptions<PaymentOptions> options) : IPaymentGateway
{
    private enum Mode { Normal, Unavailable, Throws }

    private sealed record Entry(string BasketId, decimal Amount, bool? Outcome, Mode Mode = Mode.Normal);

    private readonly ConcurrentDictionary<string, Entry> _payments = new();

    public Task<PaymentInitResult> InitializeAsync(PaymentInitRequest request, CancellationToken ct)
    {
        var token = Guid.NewGuid().ToString("N");
        _payments[token] = new Entry(request.Order.Id.ToString(), request.Order.Total, null);
        var url = $"{options.Value.ApiPublicUrl.TrimEnd('/')}/api/payments/fake/{token}";
        return Task.FromResult(new PaymentInitResult(true, token, url, null));
    }

    public Task<PaymentResult> RetrieveAsync(string token, CancellationToken ct)
    {
        if (!_payments.TryGetValue(token, out var entry))
            return Task.FromResult(new PaymentResult(false, null, null, null, "Ödeme bulunamadı."));
        if (entry.Mode == Mode.Throws) throw new HttpRequestException("Fake gateway is down.");
        if (entry.Mode == Mode.Unavailable)
            return Task.FromResult(new PaymentResult(false, null, null, null, "Gateway unavailable.", Unavailable: true));
        if (entry.Outcome != true)
            return Task.FromResult(new PaymentResult(false, entry.BasketId, entry.Amount, null, "Ödeme tamamlanmadı."));
        return Task.FromResult(new PaymentResult(true, entry.BasketId, entry.Amount, $"fake-{token[..8]}", null));
    }

    public decimal? AmountFor(string token) => _payments.TryGetValue(token, out var e) ? e.Amount : null;

    /// <summary>Records what the "customer" chose on the fake page; overrides let tests simulate tampered results.</summary>
    public void SetOutcome(string token, bool success, decimal? paidPriceOverride = null, string? basketIdOverride = null)
    {
        _payments.AddOrUpdate(token,
            _ => new Entry(basketIdOverride ?? "", paidPriceOverride ?? 0m, success),
            (_, e) => new Entry(basketIdOverride ?? e.BasketId, paidPriceOverride ?? e.Amount, success));
    }

    /// <summary>Tests: Retrieve answers "can't tell right now" (e.g. iyzico API error).</summary>
    public void SetUnavailable(string token) => _payments.AddOrUpdate(token,
        _ => new Entry("", 0m, null, Mode.Unavailable), (_, e) => e with { Mode = Mode.Unavailable });

    /// <summary>Tests: Retrieve throws (e.g. network failure).</summary>
    public void SetThrows(string token) => _payments.AddOrUpdate(token,
        _ => new Entry("", 0m, null, Mode.Throws), (_, e) => e with { Mode = Mode.Throws });
}
