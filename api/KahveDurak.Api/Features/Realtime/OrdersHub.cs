using KahveDurak.Api.Data.Entities;
using KahveDurak.Api.Features.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace KahveDurak.Api.Features.Realtime;

/// <summary>Push-only hub: clients listen for order events, they never call it.</summary>
[Authorize]
public class OrdersHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        if (Context.User?.UserId() is { } userId)
            await Groups.AddToGroupAsync(Context.ConnectionId, HubGroups.User(userId));
        if (Context.User?.IsInRole(Roles.Admin) == true)
            await Groups.AddToGroupAsync(Context.ConnectionId, HubGroups.Admins);
        await base.OnConnectedAsync();
    }
}
