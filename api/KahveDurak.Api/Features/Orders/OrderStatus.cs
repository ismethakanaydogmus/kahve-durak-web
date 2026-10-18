namespace KahveDurak.Api.Features.Orders;

public enum OrderStatus { PendingPayment, PaymentFailed, Received, Preparing, Ready, OnTheWay, Completed, Cancelled }

public enum Fulfilment { Pickup, Delivery }

/// <summary>Allowed admin transitions: one step forward at a time; cancel until Preparing (inclusive).</summary>
public static class OrderStatusMachine
{
    public static OrderStatus? Next(OrderStatus current, Fulfilment fulfilment) => current switch
    {
        OrderStatus.Received => OrderStatus.Preparing,
        OrderStatus.Preparing => fulfilment == Fulfilment.Pickup ? OrderStatus.Ready : OrderStatus.OnTheWay,
        OrderStatus.Ready or OrderStatus.OnTheWay => OrderStatus.Completed,
        _ => null,
    };

    public static bool CanCancel(OrderStatus status) => status is OrderStatus.Received or OrderStatus.Preparing;
}
