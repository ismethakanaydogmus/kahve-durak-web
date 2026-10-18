using System.Globalization;
using KahveDurak.Api.Data.Entities;
using KahveDurak.Api.Features.Orders;
using KahveDurak.Api.Features.Payments;

namespace KahveDurak.Api.Tests.Payments;

public class IyzicoRequestMappingTests
{
    private const string ShopAddress = "Bulgurlu, Demlik Sk. No:4A, 34696 Üsküdar/İstanbul";

    private static readonly PaymentOptions Options = new() { ApiPublicUrl = "https://api.test", FrontendUrl = "https://site.test" };

    private static readonly User Buyer = new()
    {
        Id = 7, FirstName = "Ayşe", LastName = "Demir", Email = "ayse@example.com", Phone = "+905551112233", PasswordHash = "x"
    };

    private static Order Order(Fulfilment fulfilment) => new()
    {
        Id = 42, UserId = 7, Fulfilment = fulfilment,
        Subtotal = 390m, DeliveryFee = fulfilment == Fulfilment.Delivery ? 30m : 0m,
        Total = fulfilment == Fulfilment.Delivery ? 420m : 390m,
        AddressTitle = fulfilment == Fulfilment.Delivery ? "Ev" : null,
        AddressNeighborhood = fulfilment == Fulfilment.Delivery ? "Ünalan" : null,
        AddressLine = fulfilment == Fulfilment.Delivery ? "Libadiye Cd. No:5 D:2" : null,
        Items =
        [
            new OrderItem { ProductId = 1, NameTr = "Latte", UnitPrice = 180m, Quantity = 1, LineTotal = 180m },
            new OrderItem { ProductId = 2, NameTr = "Iced Latte", UnitPrice = 105m, Quantity = 2, LineTotal = 210m },
        ],
    };

    private static decimal Sum(IEnumerable<string> prices) => prices.Sum(p => decimal.Parse(p, CultureInfo.InvariantCulture));

    [Fact]
    public void Maps_delivery_order_to_checkout_form_request()
    {
        var request = IyzicoPaymentGateway.BuildRequest(new PaymentInitRequest(Order(Fulfilment.Delivery), Buyer, "tr", "10.0.0.1", ShopAddress), Options);

        Assert.Equal("420.00", request.Price);
        Assert.Equal("420.00", request.PaidPrice);
        Assert.Equal("42", request.BasketId);
        Assert.Equal("TRY", request.Currency);
        Assert.Equal("tr", request.Locale);
        Assert.Equal(420m, Sum(request.BasketItems.Select(b => b.Price)));
        Assert.Equal("delivery", request.BasketItems[^1].Id);
        Assert.Equal("VIRTUAL", request.BasketItems[^1].ItemType);
        Assert.Equal("PHYSICAL", request.BasketItems[0].ItemType);
        Assert.Equal("11111111111", request.Buyer.IdentityNumber);
        Assert.Equal("Ayşe", request.Buyer.Name);
        Assert.Equal("10.0.0.1", request.Buyer.Ip);
        Assert.Equal("https://api.test/api/payments/iyzico/callback", request.CallbackUrl);
        Assert.Contains("Libadiye Cd. No:5 D:2", request.ShippingAddress.Description);
        Assert.Contains("Ünalan", request.ShippingAddress.Description);
        Assert.Equal("Ayşe Demir", request.ShippingAddress.ContactName);
    }

    [Fact]
    public void Pickup_uses_cafe_address_and_has_no_delivery_item()
    {
        var request = IyzicoPaymentGateway.BuildRequest(new PaymentInitRequest(Order(Fulfilment.Pickup), Buyer, "en", "10.0.0.1", ShopAddress), Options);

        Assert.Equal("390.00", request.Price);
        Assert.DoesNotContain(request.BasketItems, b => b.Id == "delivery");
        Assert.Equal(390m, Sum(request.BasketItems.Select(b => b.Price)));
        Assert.Contains("Demlik Sk. No:4A", request.BillingAddress.Description);
        Assert.Contains("Demlik Sk. No:4A", request.ShippingAddress.Description);
        Assert.Equal("en", request.Locale);
    }

    [Fact]
    public void Pickup_uses_configured_shop_address()
    {
        var request = IyzicoPaymentGateway.BuildRequest(
            new PaymentInitRequest(Order(Fulfilment.Pickup), Buyer, "tr", "10.0.0.1", "Yeni adres Sk. No:1, Üsküdar"), Options);

        Assert.Equal("Yeni adres Sk. No:1, Üsküdar", request.BillingAddress.Description);
        Assert.Equal("Yeni adres Sk. No:1, Üsküdar", request.Buyer.RegistrationAddress);
    }
}
