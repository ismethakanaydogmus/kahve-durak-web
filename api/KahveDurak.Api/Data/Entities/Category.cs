namespace KahveDurak.Api.Data.Entities;

public class Category
{
    public int Id { get; set; }
    public required string NameTr { get; set; }
    public string? NameEn { get; set; }
    public string? ImageUrl { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public List<Product> Products { get; set; } = [];
}
