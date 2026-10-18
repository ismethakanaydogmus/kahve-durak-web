using KahveDurak.Api.Features.Orders;

namespace KahveDurak.Api.Features.Realtime;

public record OrderStatusChangedDto(int OrderId, OrderStatus Status, DateTimeOffset At);

public static class HubEvents
{
    public const string OrderCreated = "OrderCreated";
    public const string OrderStatusChanged = "OrderStatusChanged";
}

public static class HubGroups
{
    public const string Admins = "admins";
    public static string User(int userId) => $"user-{userId}";
}
