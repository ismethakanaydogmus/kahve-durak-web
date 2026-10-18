using KahveDurak.Api.Data;
using KahveDurak.Api.Data.Entities;
using KahveDurak.Api.Features.Admin;
using KahveDurak.Api.Features.Orders;
using KahveDurak.Api.Features.Realtime;
using Microsoft.EntityFrameworkCore;

namespace KahveDurak.Api.Features.Payments;

/// <summary>
/// Settles a payment from its token. Trusts only what the gateway returns on Retrieve, never the request.
/// Idempotent and race-safe: only the request that moves the order out of PendingPayment writes history.
/// If the gateway can't answer, the order stays PendingPayment so a later callback can still settle it.
/// </summary>
public class PaymentCallbackHandler(
    AppDbContext db, IPaymentGateway gateway, IOrderNotifier notifier, TimeProvider clock, ILogger<PaymentCallbackHandler> logger)
{
    public async Task<Order?> HandleAsync(string token, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(token)) return null;
        var order = await db.Orders.AsNoTracking().SingleOrDefaultAsync(o => o.PaymentToken == token, ct);
        if (order is null || order.Status != OrderStatus.PendingPayment) return order;

        PaymentResult result;
        try
        {
            result = await gateway.RetrieveAsync(token, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Payment retrieve failed for order {OrderId}; left pending.", order.Id);
            return order;
        }
        if (result.Unavailable)
        {
            logger.LogWarning("Payment gateway could not answer for order {OrderId}: {Error}", order.Id, result.Error);
            return order;
        }

        var verified = result.Success && result.BasketId == order.Id.ToString() && result.PaidPrice == order.Total;
        if (result.Success && !verified)
            logger.LogError("Payment {PaymentId} for order {OrderId} does not match (basket {BasketId}, paid {Paid}, total {Total}).",
                result.PaymentId, order.Id, result.BasketId, result.PaidPrice, order.Total);

        var status = verified ? OrderStatus.Received : OrderStatus.PaymentFailed;
        var now = clock.GetUtcNow();
        // The customer has paid: settle completely even if their browser goes away mid-request.
        var done = CancellationToken.None;
        int settled;
        await using (var tx = await db.Database.BeginTransactionAsync(done))
        {
            // Conditional update: concurrent callbacks for the same token can't both settle the order.
            settled = await db.Orders
            .Where(o => o.Id == order.Id && o.Status == OrderStatus.PendingPayment)
            .ExecuteUpdateAsync(s => s
                .SetProperty(o => o.Status, status)
                // Kept even on a mismatch, so a captured payment can be found and refunded.
                .SetProperty(o => o.PaymentId, result.PaymentId)
                .SetProperty(o => o.UpdatedAt, now), done);
            if (settled == 1)
            {
                db.OrderStatusHistory.Add(new OrderStatusHistory { OrderId = order.Id, Status = status, At = now });
                await db.SaveChangesAsync(done);
            }
            await tx.CommitAsync(done);
        }
        if (settled == 1 && status == OrderStatus.Received) await NotifyAdminsAsync(order.Id);

        return await db.Orders.AsNoTracking().SingleAsync(o => o.Id == order.Id, done);
    }

    private async Task NotifyAdminsAsync(int orderId)
    {
        // The payment is settled either way; a failed push must not break the customer's redirect.
        try
        {
            var summary = await db.Orders.AsNoTracking().Where(o => o.Id == orderId).Select(AdminOrderMapping.ToSummary).SingleAsync();
            await notifier.OrderCreatedAsync(summary, CancellationToken.None);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "OrderCreated notification failed for order {OrderId}.", orderId);
        }
    }
}
