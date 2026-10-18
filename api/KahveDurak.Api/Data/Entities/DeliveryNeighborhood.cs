namespace KahveDurak.Api.Data.Entities;

public class DeliveryNeighborhood
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public bool IsActive { get; set; } = true;
}
