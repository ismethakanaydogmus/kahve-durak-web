using KahveDurak.Api.Data.Entities;

namespace KahveDurak.Api.Features.Shop;

/// <summary>Times are UTC. When open, ClosesAt is set; when closed, NextOpensAt is set.</summary>
public record ShopStatus(bool IsOpen, DateTimeOffset? ClosesAt, DateTimeOffset? NextOpensAt);

public static class ShopClock
{
    public static readonly TimeZoneInfo Istanbul = TimeZoneInfo.FindSystemTimeZoneById("Europe/Istanbul");

    public static ShopStatus GetStatus(IReadOnlyList<OpeningHour> hours, DateTimeOffset nowUtc)
    {
        var now = TimeZoneInfo.ConvertTime(nowUtc, Istanbul);
        var today = DateOnly.FromDateTime(now.DateTime);

        // A shift that started yesterday may still be running past midnight.
        foreach (var day in new[] { today.AddDays(-1), today })
        {
            if (Shift(hours, day) is var (start, end) && start <= now && now < end)
                return new ShopStatus(true, end.ToUniversalTime(), null);
        }

        for (var i = 0; i <= 7; i++)
        {
            if (Shift(hours, today.AddDays(i)) is var (start, _) && start > now)
                return new ShopStatus(false, null, start.ToUniversalTime());
        }

        return new ShopStatus(false, null, null);
    }

    private static (DateTimeOffset Start, DateTimeOffset End)? Shift(IReadOnlyList<OpeningHour> hours, DateOnly day)
    {
        var h = hours.FirstOrDefault(x => x.Day == day.DayOfWeek);
        if (h is null || h.IsClosed) return null;

        var start = Local(day, h.Opens);
        var end = Local(h.Closes <= h.Opens ? day.AddDays(1) : day, h.Closes);
        return (start, end);
    }

    private static DateTimeOffset Local(DateOnly day, TimeOnly time)
    {
        var local = day.ToDateTime(time, DateTimeKind.Unspecified);
        return new DateTimeOffset(local, Istanbul.GetUtcOffset(local));
    }
}
