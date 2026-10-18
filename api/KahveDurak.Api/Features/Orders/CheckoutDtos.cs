namespace KahveDurak.Api.Features.Orders;

/// <summary>What the client sends: never prices.</summary>
public record CheckoutItemRequest(int ProductId, int[] OptionIds, int Quantity);

public record CheckoutRequest(CheckoutItemRequest[] Items, Fulfilment Fulfilment, int? AddressId, string? Note, string? Lang);

public record OptionNameDto(string NameTr, string? NameEn);

public record QuoteLineDto(
    int ProductId, string NameTr, string? NameEn, List<OptionNameDto> Options,
    decimal UnitPrice, int Quantity, decimal LineTotal);

public record QuoteErrorDto(string Code, int? ProductId = null);

public record QuoteDto(
    List<QuoteLineDto> Lines, decimal Subtotal, decimal DeliveryFee, decimal Total,
    decimal MinOrderAmount, List<QuoteErrorDto> Errors)
{
    public bool CanOrder => Errors.Count == 0;
}

public static class QuoteErrors
{
    public const string EmptyCart = "EMPTY_CART";
    public const string QuantityInvalid = "QUANTITY_INVALID";
    public const string ProductUnavailable = "PRODUCT_UNAVAILABLE";
    public const string OptionInvalid = "OPTION_INVALID";
    public const string OptionRequired = "OPTION_REQUIRED";
    public const string ShopClosed = "SHOP_CLOSED";
    public const string AddressRequired = "ADDRESS_REQUIRED";
    public const string AddressInvalid = "ADDRESS_INVALID";
    public const string NeighborhoodNotServed = "NEIGHBORHOOD_NOT_SERVED";
    public const string BelowMinimum = "BELOW_MINIMUM";
    public const string NoteTooLong = "NOTE_TOO_LONG";
    public const string FulfilmentInvalid = "FULFILMENT_INVALID";
}
