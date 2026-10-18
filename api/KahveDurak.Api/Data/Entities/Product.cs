namespace KahveDurak.Api.Data.Entities;

public class Product
{
    public int Id { get; set; }
    public int CategoryId { get; set; }
    public Category? Category { get; set; }
    public required string NameTr { get; set; }
    public string? NameEn { get; set; }
    public string? DescriptionTr { get; set; }
    public string? DescriptionEn { get; set; }
    public decimal Price { get; set; }
    public string? ImageUrl { get; set; }
    public bool IsAvailable { get; set; } = true;
    public bool IsFeatured { get; set; }
    public bool IsDeleted { get; set; }
    public int SortOrder { get; set; }
    public List<OptionGroup> OptionGroups { get; set; } = [];
}
