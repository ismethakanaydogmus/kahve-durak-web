using KahveDurak.Api.Features.Admin;
using KahveDurak.Api.Features.Orders;
using Microsoft.AspNetCore.SignalR;

namespace KahveDurak.Api.Features.Realtime;

public class SignalROrderNotifier(IHubContext<OrdersHub> hub) : IOrderNotifier
{
    public Task OrderCreatedAsync(AdminOrderSummaryDto order, CancellationToken ct) =>
        hub.Clients.Group(HubGroups.Admins).SendAsync(HubEvents.OrderCreated, order, ct);

    public Task OrderStatusChangedAsync(int orderId, int userId, OrderStatus status, DateTimeOffset at, CancellationToken ct) =>
        hub.Clients.Groups(HubGroups.Admins, HubGroups.User(userId))
            .SendAsync(HubEvents.OrderStatusChanged, new OrderStatusChangedDto(orderId, status, at), ct);
}
