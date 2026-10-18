namespace KahveDurak.Api.Data.Entities;

/// <summary>Snapshot of a product at order time.</summary>
public class OrderItem
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public int ProductId { get; set; }
    public required string NameTr { get; set; }
    public string? NameEn { get; set; }
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
    public decimal LineTotal { get; set; }
    public List<OrderItemOption> Options { get; set; } = [];
}
