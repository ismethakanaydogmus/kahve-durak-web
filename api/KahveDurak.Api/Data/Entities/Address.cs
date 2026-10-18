namespace KahveDurak.Api.Data.Entities;

public class Address
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User? User { get; set; }
    public required string Title { get; set; }
    public int NeighborhoodId { get; set; }
    public DeliveryNeighborhood? Neighborhood { get; set; }
    public required string Line { get; set; }
    public string? Directions { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
