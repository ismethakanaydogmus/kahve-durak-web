using KahveDurak.Api.Data;
using KahveDurak.Api.Data.Entities;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KahveDurak.Api.Features.Admin.Catalog;

[ApiController]
[Authorize(Policy = AuthPolicies.Admin)]
[Route("api/admin")]
public partial class AdminCatalogController(AppDbContext db) : ControllerBase
{
    /// <summary>Everything an admin may edit: inactive categories and sold-out products included, deleted products not.</summary>
    [HttpGet("catalog")]
    public async Task<List<AdminCategoryDto>> Catalog(CancellationToken ct)
    {
        var categories = await db.Categories.AsNoTracking().AsSplitQuery()
            .Include(c => c.Products).ThenInclude(p => p.OptionGroups).ThenInclude(g => g.Options)
            .OrderBy(c => c.SortOrder).ThenBy(c => c.Id)
            .ToListAsync(ct);
        return categories.Select(c => c.ToAdminDto()).ToList();
    }

    [HttpPost("categories")]
    public async Task<IActionResult> CreateCategory(CategoryRequest request, IValidator<CategoryRequest> validator, CancellationToken ct)
    {
        if (await Invalid(validator, request, ct) is { } problem) return problem;
        var category = new Category { NameTr = request.NameTr.Trim(), SortOrder = await NextCategoryOrder(ct) };
        Apply(category, request);
        db.Categories.Add(category);
        await db.SaveChangesAsync(ct);
        return StatusCode(StatusCodes.Status201Created, category.ToAdminDto());
    }

    [HttpPut("categories/{id:int}")]
    public async Task<IActionResult> UpdateCategory(int id, CategoryRequest request, IValidator<CategoryRequest> validator, CancellationToken ct)
    {
        var category = await db.Categories.Include(c => c.Products).SingleOrDefaultAsync(c => c.Id == id, ct);
        if (category is null) return NotFound();
        if (await Invalid(validator, request, ct) is { } problem) return problem;
        Apply(category, request);
        await db.SaveChangesAsync(ct);
        return Ok(category.ToAdminDto());
    }

    [HttpDelete("categories/{id:int}")]
    public async Task<IActionResult> DeleteCategory(int id, CancellationToken ct)
    {
        var category = await db.Categories.SingleOrDefaultAsync(c => c.Id == id, ct);
        if (category is null) return NotFound();
        // The query filter hides deleted products, so this counts only live ones.
        if (await db.Products.AnyAsync(p => p.CategoryId == id, ct))
            return Problem(statusCode: StatusCodes.Status409Conflict, title: "Bu kategoride ürün var. Önce ürünleri taşı ya da sil.");
        // Soft-deleted products still reference the category; drop them with it (past orders keep their snapshot).
        await db.Products.IgnoreQueryFilters().Where(p => p.CategoryId == id).ExecuteDeleteAsync(ct);
        db.Categories.Remove(category);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("categories/reorder")]
    public async Task<IActionResult> ReorderCategories(ReorderRequest request, CancellationToken ct)
    {
        var categories = await db.Categories.ToListAsync(ct);
        if (!IsPermutation(request.Ids, categories.Select(c => c.Id))) return Problem(statusCode: 400, title: "Sıralama bütün kategorileri bir kez içermeli.");
        foreach (var c in categories) c.SortOrder = Array.IndexOf(request.Ids, c.Id) + 1;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static void Apply(Category c, CategoryRequest r)
    {
        c.NameTr = r.NameTr.Trim();
        c.NameEn = r.NameEn.Clean();
        c.ImageUrl = r.ImageUrl.Clean();
        c.IsActive = r.IsActive;
    }

    private async Task<int> NextCategoryOrder(CancellationToken ct) =>
        (await db.Categories.MaxAsync(c => (int?)c.SortOrder, ct) ?? 0) + 1;

    private static bool IsPermutation(int[]? ids, IEnumerable<int> existing)
    {
        var set = existing.ToHashSet();
        return ids is not null && ids.Length == set.Count && ids.Distinct().Count() == ids.Length && ids.All(set.Contains);
    }

    private async Task<IActionResult?> Invalid<T>(IValidator<T> validator, T request, CancellationToken ct)
    {
        var result = await validator.ValidateAsync(request, ct);
        return result.IsValid ? null : ValidationProblem(new ValidationProblemDetails(result.ToDictionary()));
    }
}
