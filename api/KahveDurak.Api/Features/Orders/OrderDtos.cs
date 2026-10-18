using KahveDurak.Api.Data.Entities;

namespace KahveDurak.Api.Features.Orders;

public record OrderItemDto(string NameTr, string? NameEn, List<OptionNameDto> Options, decimal UnitPrice, int Quantity, decimal LineTotal);

public record OrderAddressDto(string Title, string Neighborhood, string Line, string? Directions);

public record StatusEntryDto(OrderStatus Status, DateTimeOffset At);

public record OrderSummaryDto(int Id, OrderStatus Status, Fulfilment Fulfilment, decimal Total, int ItemCount, DateTimeOffset CreatedAt);

public record OrderDetailDto(
    int Id, OrderStatus Status, Fulfilment Fulfilment, List<OrderItemDto> Items,
    decimal Subtotal, decimal DeliveryFee, decimal Total, string? Note, OrderAddressDto? Address,
    List<StatusEntryDto> History, DateTimeOffset CreatedAt);

public static class OrderMapping
{
    public static OrderDetailDto ToDetail(this Order o) => new(
        o.Id, o.Status, o.Fulfilment,
        o.Items.OrderBy(i => i.Id).Select(i => new OrderItemDto(
            i.NameTr, i.NameEn,
            i.Options.OrderBy(x => x.Id).Select(x => new OptionNameDto(x.NameTr, x.NameEn)).ToList(),
            i.UnitPrice, i.Quantity, i.LineTotal)).ToList(),
        o.Subtotal, o.DeliveryFee, o.Total, o.Note,
        o.Fulfilment == Fulfilment.Delivery && o.AddressLine is not null
            ? new OrderAddressDto(o.AddressTitle ?? "", o.AddressNeighborhood ?? "", o.AddressLine, o.AddressDirections)
            : null,
        o.History.OrderBy(h => h.At).ThenBy(h => h.Id).Select(h => new StatusEntryDto(h.Status, h.At)).ToList(),
        o.CreatedAt);
}
