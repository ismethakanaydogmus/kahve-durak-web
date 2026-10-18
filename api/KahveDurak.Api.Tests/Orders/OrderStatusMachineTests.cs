using KahveDurak.Api.Features.Orders;

namespace KahveDurak.Api.Tests.Orders;

public class OrderStatusMachineTests
{
    [Theory]
    [InlineData(OrderStatus.Received, Fulfilment.Pickup, OrderStatus.Preparing)]
    [InlineData(OrderStatus.Preparing, Fulfilment.Pickup, OrderStatus.Ready)]
    [InlineData(OrderStatus.Ready, Fulfilment.Pickup, OrderStatus.Completed)]
    [InlineData(OrderStatus.Received, Fulfilment.Delivery, OrderStatus.Preparing)]
    [InlineData(OrderStatus.Preparing, Fulfilment.Delivery, OrderStatus.OnTheWay)]
    [InlineData(OrderStatus.OnTheWay, Fulfilment.Delivery, OrderStatus.Completed)]
    public void Next_moves_one_step_forward(OrderStatus current, Fulfilment fulfilment, OrderStatus expected)
    {
        Assert.Equal(expected, OrderStatusMachine.Next(current, fulfilment));
    }

    [Theory]
    [InlineData(OrderStatus.PendingPayment)]
    [InlineData(OrderStatus.PaymentFailed)]
    [InlineData(OrderStatus.Completed)]
    [InlineData(OrderStatus.Cancelled)]
    public void Next_is_null_for_states_admins_cannot_advance(OrderStatus current)
    {
        Assert.Null(OrderStatusMachine.Next(current, Fulfilment.Pickup));
        Assert.Null(OrderStatusMachine.Next(current, Fulfilment.Delivery));
    }

    [Theory]
    [InlineData(OrderStatus.Received, true)]
    [InlineData(OrderStatus.Preparing, true)]
    [InlineData(OrderStatus.Ready, false)]
    [InlineData(OrderStatus.OnTheWay, false)]
    [InlineData(OrderStatus.Completed, false)]
    [InlineData(OrderStatus.PendingPayment, false)]
    [InlineData(OrderStatus.Cancelled, false)]
    public void CanCancel_only_until_preparing(OrderStatus status, bool expected)
    {
        Assert.Equal(expected, OrderStatusMachine.CanCancel(status));
    }
}
