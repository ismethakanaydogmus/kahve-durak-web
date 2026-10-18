namespace KahveDurak.Api.Features.Payments;

/// <summary>Bound from the "Payments" config section.</summary>
public class PaymentOptions
{
    public const string Iyzico = "Iyzico";
    public const string Fake = "Fake";

    public string Provider { get; set; } = Iyzico;

    /// <summary>Public base URL of this API; iyzico posts the payment result to {ApiPublicUrl}/api/payments/iyzico/callback.</summary>
    public string ApiPublicUrl { get; set; } = "";

    /// <summary>Where customers are sent after payment. Defaults to the first CORS origin.</summary>
    public string FrontendUrl { get; set; } = "";
}

/// <summary>Bound from the "Iyzico" config section. Keys come from user-secrets or environment variables.</summary>
public class IyzicoOptions
{
    public string ApiKey { get; set; } = "";
    public string SecretKey { get; set; } = "";
    public string BaseUrl { get; set; } = "https://sandbox-api.iyzipay.com";
}
