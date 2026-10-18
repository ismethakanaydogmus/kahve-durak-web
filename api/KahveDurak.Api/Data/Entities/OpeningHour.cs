namespace KahveDurak.Api.Data.Entities;

public class OpeningHour
{
    public int Id { get; set; }
    public DayOfWeek Day { get; set; }
    public TimeOnly Opens { get; set; }
    public TimeOnly Closes { get; set; }
    public bool IsClosed { get; set; }
}
