using KahveDurak.Api.Data;
using KahveDurak.Api.Features.Orders;
using KahveDurak.Api.Features.Realtime;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KahveDurak.Api.Features.Admin;

[ApiController]
[Authorize(Policy = AuthPolicies.Admin)]
[Route("api/admin/orders")]
public class AdminOrdersController(
    AppDbContext db, IOrderNotifier notifier, TimeProvider clock, ILogger<AdminOrdersController> logger) : ControllerBase
{
    private const int MaxRows = 200;

    private static readonly Dictionary<string, OrderStatus[]> Filters = new()
    {
        ["active"] = [OrderStatus.Received, OrderStatus.Preparing, OrderStatus.Ready, OrderStatus.OnTheWay],
        ["completed"] = [OrderStatus.Completed],
        ["cancelled"] = [OrderStatus.Cancelled],
        ["failed"] = [OrderStatus.PaymentFailed],
        // Unpaid orders are never the café's business, so PendingPayment appears in no filter.
        ["all"] = [OrderStatus.Received, OrderStatus.Preparing, OrderStatus.Ready, OrderStatus.OnTheWay,
            OrderStatus.Completed, OrderStatus.Cancelled, OrderStatus.PaymentFailed],
    };

    [HttpGet]
    public async Task<ActionResult<List<AdminOrderSummaryDto>>> List([FromQuery] string filter = "active", CancellationToken ct = default)
    {
        if (!Filters.TryGetValue(filter, out var statuses)) return BadRequest();
        var query = db.Orders.AsNoTracking().Where(o => statuses.Contains(o.Status));
        // Active orders: first come, first served. History views: newest first.
        query = filter == "active"
            ? query.OrderBy(o => o.CreatedAt).ThenBy(o => o.Id)
            : query.OrderByDescending(o => o.CreatedAt).ThenByDescending(o => o.Id);
        return await query.Take(MaxRows).Select(AdminOrderMapping.ToSummary).ToListAsync(ct);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<AdminOrderDetailDto>> Detail(int id, CancellationToken ct)
    {
        var order = await LoadAsync(id, ct);
        return order is null ? NotFound() : order.ToAdminDetail();
    }

    /// <summary>One step forward. Expected is the status the admin saw; a stale one answers 409.</summary>
    [HttpPost("{id:int}/advance")]
    public Task<IActionResult> Advance(int id, AdminStatusRequest request, CancellationToken ct) =>
        TransitionAsync(id, request.Expected, o => OrderStatusMachine.Next(request.Expected, o), ct);

    [HttpPost("{id:int}/cancel")]
    public Task<IActionResult> Cancel(int id, AdminStatusRequest request, CancellationToken ct) =>
        TransitionAsync(id, request.Expected, _ => OrderStatusMachine.CanCancel(request.Expected) ? OrderStatus.Cancelled : null, ct);

    private async Task<IActionResult> TransitionAsync(
        int id, OrderStatus expected, Func<Fulfilment, OrderStatus?> target, CancellationToken ct)
    {
        var current = await db.Orders.AsNoTracking()
            .Where(o => o.Id == id && o.Status != OrderStatus.PendingPayment)
            .Select(o => new { o.Fulfilment, o.UserId })
            .SingleOrDefaultAsync(ct);
        if (current is null) return NotFound();
        if (target(current.Fulfilment) is not { } next)
            return Problem(statusCode: StatusCodes.Status400BadRequest, title: "Bu siparişte bu işlem yapılamaz.");

        var now = clock.GetUtcNow();
        // From here on the change must land whole even if the admin's connection drops: no request token.
        var done = CancellationToken.None;
        await using (var tx = await db.Database.BeginTransactionAsync(done))
        {
            // Only the request that still sees the expected status wins; two admins can't both move the order.
            var changed = await db.Orders
                .Where(o => o.Id == id && o.Status == expected)
                .ExecuteUpdateAsync(s => s.SetProperty(o => o.Status, next).SetProperty(o => o.UpdatedAt, now), done);
            if (changed == 0)
                return Problem(statusCode: StatusCodes.Status409Conflict,
                title: "Sipariş az önce güncellendi. Güncel durumu görmek için sayfayı yenile.");

            db.OrderStatusHistory.Add(new Data.Entities.OrderStatusHistory { OrderId = id, Status = next, At = now });
            await db.SaveChangesAsync(done);
            await tx.CommitAsync(done);
        }
        try
        {
            await notifier.OrderStatusChangedAsync(id, current.UserId, next, now, done);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "OrderStatusChanged notification failed for order {OrderId}.", id);
        }

        return Ok((await LoadAsync(id, done))!.ToAdminDetail());
    }

    private Task<Data.Entities.Order?> LoadAsync(int id, CancellationToken ct) =>
        db.Orders.AsNoTracking().AsSplitQuery()
            .Include(o => o.User).Include(o => o.Items).ThenInclude(i => i.Options).Include(o => o.History)
            .SingleOrDefaultAsync(o => o.Id == id && o.Status != OrderStatus.PendingPayment, ct);
}
