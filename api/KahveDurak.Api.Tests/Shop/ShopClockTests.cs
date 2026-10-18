using KahveDurak.Api.Data.Entities;
using KahveDurak.Api.Features.Shop;

namespace KahveDurak.Api.Tests.Shop;

public class ShopClockTests
{
    // 2026-10-19 is a Monday, 2026-10-20 a Tuesday. Istanbul is UTC+3 all year.
    private static readonly TimeSpan Istanbul = TimeSpan.FromHours(3);

    private static DateTimeOffset Ist(int day, int hour, int minute = 0) =>
        new DateTimeOffset(2026, 10, day, hour, minute, 0, Istanbul).ToUniversalTime();

    private static List<OpeningHour> EveryDay(TimeOnly opens, TimeOnly closes) =>
        Enum.GetValues<DayOfWeek>()
            .Select(d => new OpeningHour { Day = d, Opens = opens, Closes = closes })
            .ToList();

    private static readonly List<OpeningHour> Overnight = EveryDay(new(10, 0), new(3, 0));

    [Fact]
    public void Monday_0959_is_closed_and_opens_at_1000()
    {
        var status = ShopClock.GetStatus(Overnight, Ist(19, 9, 59));

        Assert.False(status.IsOpen);
        Assert.Equal(Ist(19, 10), status.NextOpensAt);
        Assert.Null(status.ClosesAt);
    }

    [Fact]
    public void Monday_1000_is_open_until_tuesday_0300()
    {
        var status = ShopClock.GetStatus(Overnight, Ist(19, 10));

        Assert.True(status.IsOpen);
        Assert.Equal(Ist(20, 3), status.ClosesAt);
        Assert.Null(status.NextOpensAt);
    }

    [Fact]
    public void Tuesday_0130_is_open_within_monday_shift()
    {
        var status = ShopClock.GetStatus(Overnight, Ist(20, 1, 30));

        Assert.True(status.IsOpen);
        Assert.Equal(Ist(20, 3), status.ClosesAt);
    }

    [Fact]
    public void Tuesday_0259_is_open()
    {
        Assert.True(ShopClock.GetStatus(Overnight, Ist(20, 2, 59)).IsOpen);
    }

    [Fact]
    public void Tuesday_0300_is_closed_and_opens_at_1000()
    {
        var status = ShopClock.GetStatus(Overnight, Ist(20, 3));

        Assert.False(status.IsOpen);
        Assert.Equal(Ist(20, 10), status.NextOpensAt);
    }

    [Fact]
    public void Closed_sunday_is_closed_and_opens_monday()
    {
        var hours = Overnight.Select(h => new OpeningHour
        {
            Day = h.Day, Opens = h.Opens, Closes = h.Closes, IsClosed = h.Day == DayOfWeek.Sunday
        }).ToList();

        var sunday = ShopClock.GetStatus(hours, Ist(18, 12));
        Assert.False(sunday.IsOpen);
        Assert.Equal(Ist(19, 10), sunday.NextOpensAt);

        // No overnight carry-over from a closed Sunday.
        var mondayNight = ShopClock.GetStatus(hours, Ist(19, 1));
        Assert.False(mondayNight.IsOpen);
        Assert.Equal(Ist(19, 10), mondayNight.NextOpensAt);
    }

    [Fact]
    public void Daytime_shift_end_is_exclusive()
    {
        var hours = EveryDay(new(9, 0), new(18, 0));

        Assert.True(ShopClock.GetStatus(hours, Ist(19, 17, 59)).IsOpen);
        var atClose = ShopClock.GetStatus(hours, Ist(19, 18));
        Assert.False(atClose.IsOpen);
        Assert.Equal(Ist(20, 9), atClose.NextOpensAt);
    }
}
