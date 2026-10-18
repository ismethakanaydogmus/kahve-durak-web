using KahveDurak.Api.Data;
using KahveDurak.Api.Features.Orders;
using KahveDurak.Api.Features.Shop;
using Microsoft.EntityFrameworkCore;

namespace KahveDurak.Api.Features.Admin;

public record TopProductDto(string NameTr, int Quantity, decimal Revenue);

public record DashboardDto(decimal TodayRevenue, int TodayOrders, decimal AverageBasket, List<TopProductDto> TopProducts);

/// <summary>Sales figures; "today" starts at midnight in Istanbul.</summary>
public class DashboardQuery(AppDbContext db, TimeProvider clock)
{
    /// <summary>Paid and not cancelled.</summary>
    private static readonly OrderStatus[] Sold =
        [OrderStatus.Received, OrderStatus.Preparing, OrderStatus.Ready, OrderStatus.OnTheWay, OrderStatus.Completed];

    public async Task<DashboardDto> GetAsync(CancellationToken ct)
    {
        var todayStart = IstanbulMidnight(clock.GetUtcNow());
        var weekStart = todayStart.AddDays(-6);
        var sold = db.Orders.AsNoTracking().Where(o => Sold.Contains(o.Status));

        var today = sold.Where(o => o.CreatedAt >= todayStart);
        var revenue = await today.SumAsync(o => o.Total, ct);
        var count = await today.CountAsync(ct);

        var weekItems =
            from item in db.OrderItems.AsNoTracking()
            join order in sold.Where(o => o.CreatedAt >= weekStart) on item.OrderId equals order.Id
            select new { item.ProductId, item.NameTr, item.Quantity, item.LineTotal, order.CreatedAt };
        // By product, not name: a renamed product stays one row, shown under its most recent name.
        var totals = await weekItems
            .GroupBy(i => i.ProductId)
            .Select(g => new { ProductId = g.Key, Quantity = g.Sum(i => i.Quantity), Revenue = g.Sum(i => i.LineTotal) })
            .OrderByDescending(p => p.Quantity).ThenByDescending(p => p.Revenue)
            .Take(5)
            .ToListAsync(ct);
        var ids = totals.Select(t => t.ProductId).ToList();
        var latestNames = (await weekItems.Where(i => ids.Contains(i.ProductId)).ToListAsync(ct))
            .GroupBy(i => i.ProductId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(i => i.CreatedAt).First().NameTr);
        var top = totals.Select(t => new TopProductDto(latestNames[t.ProductId], t.Quantity, t.Revenue)).ToList();

        return new DashboardDto(revenue, count, count == 0 ? 0m : Math.Round(revenue / count, 2), top);
    }

    private static DateTimeOffset IstanbulMidnight(DateTimeOffset nowUtc)
    {
        var local = TimeZoneInfo.ConvertTime(nowUtc, ShopClock.Istanbul);
        var midnight = local.Date;
        return new DateTimeOffset(midnight, ShopClock.Istanbul.GetUtcOffset(midnight)).ToUniversalTime();
    }
}
