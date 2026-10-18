namespace KahveDurak.Api.Data.Entities;

public class OptionGroup
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public required string NameTr { get; set; }
    public string? NameEn { get; set; }
    public bool IsRequired { get; set; }
    public int MinSelect { get; set; }
    public int MaxSelect { get; set; } = 1;
    public int SortOrder { get; set; }
    public List<Option> Options { get; set; } = [];
}
