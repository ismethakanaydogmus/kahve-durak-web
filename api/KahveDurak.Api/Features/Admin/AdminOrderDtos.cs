using System.Linq.Expressions;
using KahveDurak.Api.Data.Entities;
using KahveDurak.Api.Features.Orders;

namespace KahveDurak.Api.Features.Admin;

public record AdminOrderSummaryDto(
    int Id, OrderStatus Status, Fulfilment Fulfilment, decimal Total, int ItemCount, DateTimeOffset CreatedAt,
    string CustomerName, string CustomerPhone, string? Neighborhood);

/// <summary>The status the admin saw when acting; guards against two admins moving the same order.</summary>
public record AdminStatusRequest(OrderStatus Expected);

public record AdminCustomerDto(string Name, string Email, string Phone);

/// <summary>Next is the one forward step an admin may take (null when none); CanCancel per OrderStatusMachine.</summary>
public record AdminOrderDetailDto(OrderDetailDto Order, AdminCustomerDto Customer, OrderStatus? Next, bool CanCancel);

public static class AdminOrderMapping
{
    /// <summary>SQL-translatable projection, shared by the list endpoint and the OrderCreated event.</summary>
    public static readonly Expression<Func<Order, AdminOrderSummaryDto>> ToSummary = o => new AdminOrderSummaryDto(
        o.Id, o.Status, o.Fulfilment, o.Total, o.Items.Sum(i => i.Quantity), o.CreatedAt,
        o.User!.FirstName + " " + o.User.LastName, o.User.Phone, o.AddressNeighborhood);

    public static AdminOrderDetailDto ToAdminDetail(this Order o) => new(
        o.ToDetail(),
        new AdminCustomerDto($"{o.User!.FirstName} {o.User.LastName}", o.User.Email, o.User.Phone),
        OrderStatusMachine.Next(o.Status, o.Fulfilment),
        OrderStatusMachine.CanCancel(o.Status));
}
