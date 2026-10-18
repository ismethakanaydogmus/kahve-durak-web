namespace KahveDurak.Api.Data.Entities;

public class OrderItemOption
{
    public int Id { get; set; }
    public int OrderItemId { get; set; }
    public int OptionId { get; set; }
    public required string NameTr { get; set; }
    public string? NameEn { get; set; }
    public decimal PriceDelta { get; set; }
}
