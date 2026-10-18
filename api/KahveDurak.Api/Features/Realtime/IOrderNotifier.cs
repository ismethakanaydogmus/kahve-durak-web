using KahveDurak.Api.Features.Admin;
using KahveDurak.Api.Features.Orders;

namespace KahveDurak.Api.Features.Realtime;

public interface IOrderNotifier
{
    /// <summary>A paid order arrived: admins only.</summary>
    Task OrderCreatedAsync(AdminOrderSummaryDto order, CancellationToken ct);

    /// <summary>Status moved: admins and the order's owner.</summary>
    Task OrderStatusChangedAsync(int orderId, int userId, OrderStatus status, DateTimeOffset at, CancellationToken ct);
}
