using System.Globalization;
using KahveDurak.Api.Features.Orders;
using Iyzipay.Model;
using Iyzipay.Request;
using Microsoft.Extensions.Options;
using IyziAddress = Iyzipay.Model.Address;
using IyziOptions = Iyzipay.Options;

namespace KahveDurak.Api.Features.Payments;

/// <summary>iyzico Checkout Form: card data is entered on iyzico's page and never reaches this API.</summary>
public class IyzicoPaymentGateway(IOptions<PaymentOptions> payment, IOptions<IyzicoOptions> iyzico) : IPaymentGateway
{
    // Demo project: iyzico requires a TCKN; the sandbox accepts this fixed placeholder.
    public const string DemoIdentityNumber = "11111111111";

    private IyziOptions ClientOptions => new()
    {
        ApiKey = iyzico.Value.ApiKey, SecretKey = iyzico.Value.SecretKey, BaseUrl = iyzico.Value.BaseUrl
    };

    public async Task<PaymentInitResult> InitializeAsync(PaymentInitRequest request, CancellationToken ct)
    {
        var result = await CheckoutFormInitialize.Create(BuildRequest(request, payment.Value), ClientOptions);
        return result.Status == "success"
            ? new PaymentInitResult(true, result.Token, result.PaymentPageUrl, null)
            : new PaymentInitResult(false, null, null, result.ErrorMessage);
    }

    public async Task<PaymentResult> RetrieveAsync(string token, CancellationToken ct)
    {
        var result = await CheckoutForm.Retrieve(new RetrieveCheckoutFormRequest { Token = token }, ClientOptions);
        // Status is the API call itself; PaymentStatus is the card payment. A failed call says nothing about the payment.
        if (result.Status != "success")
            return new PaymentResult(false, null, null, null, result.ErrorMessage, Unavailable: true);
        if (result.PaymentStatus != "SUCCESS")
            return new PaymentResult(false, result.BasketId, null, result.PaymentId, result.PaymentStatus);
        var paid = decimal.TryParse(result.PaidPrice, NumberStyles.Number, CultureInfo.InvariantCulture, out var p) ? p : (decimal?)null;
        return new PaymentResult(true, result.BasketId, paid, result.PaymentId, null);
    }

    public static CreateCheckoutFormInitializeRequest BuildRequest(PaymentInitRequest request, PaymentOptions options)
    {
        var (order, buyer) = (request.Order, request.Buyer);
        var contact = $"{buyer.FirstName} {buyer.LastName}";
        var address = order.Fulfilment == Fulfilment.Delivery
            ? string.Join(", ", new[] { order.AddressLine, order.AddressDirections, order.AddressNeighborhood, "Üsküdar/İstanbul" }
                .Where(s => !string.IsNullOrWhiteSpace(s)))
            : request.ShopAddress;
        IyziAddress Addr() => new() { ContactName = contact, City = "Istanbul", Country = "Turkey", Description = address };

        var basket = order.Items.Select((item, i) => new BasketItem
        {
            Id = $"item-{i + 1}", Name = item.NameTr, Category1 = "İçecek",
            ItemType = nameof(BasketItemType.PHYSICAL), Price = Money(item.LineTotal),
        }).ToList();
        if (order.DeliveryFee > 0)
            basket.Add(new BasketItem
            {
                Id = "delivery", Name = "Teslimat ücreti", Category1 = "Teslimat",
                ItemType = nameof(BasketItemType.VIRTUAL), Price = Money(order.DeliveryFee),
            });

        return new CreateCheckoutFormInitializeRequest
        {
            Locale = request.Locale == "en" ? Locale.EN.ToString() : Locale.TR.ToString(),
            ConversationId = order.Id.ToString(),
            Price = Money(order.Total),
            PaidPrice = Money(order.Total),
            Currency = Currency.TRY.ToString(),
            BasketId = order.Id.ToString(),
            PaymentGroup = PaymentGroup.PRODUCT.ToString(),
            CallbackUrl = $"{options.ApiPublicUrl.TrimEnd('/')}/api/payments/iyzico/callback",
            EnabledInstallments = [1],
            Buyer = new Buyer
            {
                Id = buyer.Id.ToString(), Name = buyer.FirstName, Surname = buyer.LastName, Email = buyer.Email,
                GsmNumber = buyer.Phone, IdentityNumber = DemoIdentityNumber, RegistrationAddress = address,
                City = "Istanbul", Country = "Turkey", Ip = request.BuyerIp,
            },
            ShippingAddress = Addr(),
            BillingAddress = Addr(),
            BasketItems = basket,
        };
    }

    private static string Money(decimal amount) => amount.ToString("0.00", CultureInfo.InvariantCulture);
}
