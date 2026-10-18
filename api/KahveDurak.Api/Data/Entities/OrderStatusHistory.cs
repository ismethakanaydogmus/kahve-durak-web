using KahveDurak.Api.Features.Orders;

namespace KahveDurak.Api.Data.Entities;

public class OrderStatusHistory
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public OrderStatus Status { get; set; }
    public DateTimeOffset At { get; set; } = DateTimeOffset.UtcNow;
}
