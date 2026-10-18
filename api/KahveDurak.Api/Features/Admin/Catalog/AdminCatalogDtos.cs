using KahveDurak.Api.Data.Entities;

namespace KahveDurak.Api.Features.Admin.Catalog;

public record AdminOptionDto(int Id, string NameTr, string? NameEn, decimal PriceDelta);

public record AdminOptionGroupDto(int Id, string NameTr, string? NameEn, bool IsRequired, int MaxSelect, List<AdminOptionDto> Options);

public record AdminProductDto(
    int Id, int CategoryId, string NameTr, string? NameEn, string? DescriptionTr, string? DescriptionEn,
    decimal Price, string? ImageUrl, bool IsAvailable, bool IsFeatured, List<AdminOptionGroupDto> OptionGroups);

public record AdminCategoryDto(int Id, string NameTr, string? NameEn, string? ImageUrl, bool IsActive, List<AdminProductDto> Products);

public record CategoryRequest(string NameTr, string? NameEn, string? ImageUrl, bool IsActive);

public record ReorderRequest(int[] Ids);

public static class AdminCatalogMapping
{
    public static AdminProductDto ToAdminDto(this Product p) => new(
        p.Id, p.CategoryId, p.NameTr, p.NameEn, p.DescriptionTr, p.DescriptionEn, p.Price, p.ImageUrl, p.IsAvailable, p.IsFeatured,
        p.OptionGroups.OrderBy(g => g.SortOrder).Select(g => new AdminOptionGroupDto(
            g.Id, g.NameTr, g.NameEn, g.IsRequired, g.MaxSelect,
            g.Options.OrderBy(o => o.SortOrder).Select(o => new AdminOptionDto(o.Id, o.NameTr, o.NameEn, o.PriceDelta)).ToList())).ToList());

    public static AdminCategoryDto ToAdminDto(this Category c) => new(
        c.Id, c.NameTr, c.NameEn, c.ImageUrl, c.IsActive,
        c.Products.OrderBy(p => p.SortOrder).Select(p => p.ToAdminDto()).ToList());

    /// <summary>Blank optional text becomes null so the TR fallback applies on the site.</summary>
    public static string? Clean(this string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();
}

public record OptionRequest(int? Id, string NameTr, string? NameEn, decimal PriceDelta);

/// <summary>MaxSelect 1 = single choice; 2+ = pick up to that many. MinSelect follows IsRequired.</summary>
public record OptionGroupRequest(int? Id, string NameTr, string? NameEn, bool IsRequired, int MaxSelect, OptionRequest[] Options);

public record ProductRequest(
    int CategoryId, string NameTr, string? NameEn, string? DescriptionTr, string? DescriptionEn, decimal Price,
    string? ImageUrl, bool IsAvailable, bool IsFeatured, OptionGroupRequest[] OptionGroups);

public record AvailabilityRequest(bool IsAvailable);

public record ProductReorderRequest(int CategoryId, int[] Ids);
