using KahveDurak.Api.Features.Orders;

namespace KahveDurak.Api.Data.Entities;

public class Order
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User? User { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.PendingPayment;
    public Fulfilment Fulfilment { get; set; }
    public decimal Subtotal { get; set; }
    public decimal DeliveryFee { get; set; }
    public decimal Total { get; set; }
    public string? Note { get; set; }

    // Address snapshot (delivery only), so later edits or deletes don't change past orders.
    public string? AddressTitle { get; set; }
    public string? AddressNeighborhood { get; set; }
    public string? AddressLine { get; set; }
    public string? AddressDirections { get; set; }

    public string? PaymentToken { get; set; }
    public string? PaymentId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public List<OrderItem> Items { get; set; } = [];
    public List<OrderStatusHistory> History { get; set; } = [];
}
