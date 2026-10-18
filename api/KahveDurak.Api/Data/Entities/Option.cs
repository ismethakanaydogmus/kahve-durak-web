namespace KahveDurak.Api.Data.Entities;

public class Option
{
    public int Id { get; set; }
    public int OptionGroupId { get; set; }
    public required string NameTr { get; set; }
    public string? NameEn { get; set; }
    public decimal PriceDelta { get; set; }
    public int SortOrder { get; set; }
}
