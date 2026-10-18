using KahveDurak.Api.Data.Entities;

namespace KahveDurak.Api.Features.Payments;

/// <summary>ShopAddress (from settings) is sent as billing/shipping address for pickup orders.</summary>
public record PaymentInitRequest(Order Order, User Buyer, string Locale, string BuyerIp, string ShopAddress);

public record PaymentInitResult(bool Success, string? Token, string? PaymentPageUrl, string? Error);

/// <summary>Unavailable: the gateway could not say what happened (API or network error); the payment may still have gone through.</summary>
public record PaymentResult(bool Success, string? BasketId, decimal? PaidPrice, string? PaymentId, string? Error, bool Unavailable = false);

/// <summary>A hosted payment page provider: start a payment for an order, then read back its verified result.</summary>
public interface IPaymentGateway
{
    Task<PaymentInitResult> InitializeAsync(PaymentInitRequest request, CancellationToken ct);

    Task<PaymentResult> RetrieveAsync(string token, CancellationToken ct);
}
