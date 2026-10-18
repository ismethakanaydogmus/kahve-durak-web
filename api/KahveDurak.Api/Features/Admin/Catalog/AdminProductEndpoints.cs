using KahveDurak.Api.Data.Entities;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KahveDurak.Api.Features.Admin.Catalog;

public partial class AdminCatalogController
{
    [HttpPost("products")]
    public async Task<IActionResult> CreateProduct(ProductRequest request, IValidator<ProductRequest> validator, CancellationToken ct)
    {
        if (await Invalid(validator, request, ct) is { } problem) return problem;
        if (!await db.Categories.AnyAsync(c => c.Id == request.CategoryId, ct)) return Problem(statusCode: 400, title: "Kategori bulunamadı.");

        var product = new Product { NameTr = request.NameTr.Trim(), SortOrder = await NextProductOrder(request.CategoryId, ct) };
        Apply(product, request);
        if (SyncOptionGroups(product, request.OptionGroups) is { } error) return Problem(statusCode: 400, title: error);
        db.Products.Add(product);
        await db.SaveChangesAsync(ct);
        return StatusCode(StatusCodes.Status201Created, product.ToAdminDto());
    }

    [HttpPut("products/{id:int}")]
    public async Task<IActionResult> UpdateProduct(int id, ProductRequest request, IValidator<ProductRequest> validator, CancellationToken ct)
    {
        var product = await db.Products.Include(p => p.OptionGroups).ThenInclude(g => g.Options).SingleOrDefaultAsync(p => p.Id == id, ct);
        if (product is null) return NotFound();
        if (await Invalid(validator, request, ct) is { } problem) return problem;
        if (!await db.Categories.AnyAsync(c => c.Id == request.CategoryId, ct)) return Problem(statusCode: 400, title: "Kategori bulunamadı.");

        if (product.CategoryId != request.CategoryId) product.SortOrder = await NextProductOrder(request.CategoryId, ct);
        Apply(product, request);
        if (SyncOptionGroups(product, request.OptionGroups) is { } error) return Problem(statusCode: 400, title: error);
        await db.SaveChangesAsync(ct);
        return Ok(product.ToAdminDto());
    }

    [HttpPatch("products/{id:int}/availability")]
    public async Task<IActionResult> SetAvailability(int id, AvailabilityRequest request, CancellationToken ct)
    {
        var changed = await db.Products.Where(p => p.Id == id)
            .ExecuteUpdateAsync(s => s.SetProperty(p => p.IsAvailable, request.IsAvailable), ct);
        return changed == 0 ? NotFound() : NoContent();
    }

    /// <summary>Soft delete: gone from the menu; past orders keep their snapshot.</summary>
    [HttpDelete("products/{id:int}")]
    public async Task<IActionResult> DeleteProduct(int id, CancellationToken ct)
    {
        var changed = await db.Products.Where(p => p.Id == id)
            .ExecuteUpdateAsync(s => s.SetProperty(p => p.IsDeleted, true).SetProperty(p => p.IsFeatured, false), ct);
        return changed == 0 ? NotFound() : NoContent();
    }

    [HttpPost("products/reorder")]
    public async Task<IActionResult> ReorderProducts(ProductReorderRequest request, CancellationToken ct)
    {
        var products = await db.Products.Where(p => p.CategoryId == request.CategoryId).ToListAsync(ct);
        if (products.Count == 0 || !IsPermutation(request.Ids, products.Select(p => p.Id)))
            return Problem(statusCode: 400, title: "Sıralama kategorinin bütün ürünlerini bir kez içermeli.");
        foreach (var p in products) p.SortOrder = Array.IndexOf(request.Ids, p.Id) + 1;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static void Apply(Product p, ProductRequest r)
    {
        p.CategoryId = r.CategoryId;
        p.NameTr = r.NameTr.Trim();
        p.NameEn = r.NameEn.Clean();
        p.DescriptionTr = r.DescriptionTr.Clean();
        p.DescriptionEn = r.DescriptionEn.Clean();
        p.Price = r.Price;
        p.ImageUrl = r.ImageUrl.Clean();
        p.IsAvailable = r.IsAvailable;
        p.IsFeatured = r.IsFeatured;
    }

    /// <summary>
    /// Upsert by id: known groups/options are updated in place (ids stay, so carts stay valid), new ones are added,
    /// missing ones are removed. Returns an error when an id doesn't belong to this product.
    /// </summary>
    private static string? SyncOptionGroups(Product product, OptionGroupRequest[] requested)
    {
        var groupsById = product.OptionGroups.ToDictionary(g => g.Id);
        foreach (var g in requested)
        {
            if (g.Id is { } gid && !groupsById.ContainsKey(gid)) return "Seçenek grubu bu ürüne ait değil.";
            var known = g.Id is { } id ? groupsById[id].Options.Select(o => o.Id).ToHashSet() : [];
            if (g.Options.Any(o => o.Id is { } oid && !known.Contains(oid))) return "Seçenek bu gruba ait değil.";
        }

        var keepGroups = requested.Where(g => g.Id is not null).Select(g => g.Id!.Value).ToHashSet();
        product.OptionGroups.RemoveAll(g => !keepGroups.Contains(g.Id));

        for (var i = 0; i < requested.Length; i++)
        {
            var r = requested[i];
            var group = r.Id is { } gid ? groupsById[gid] : new OptionGroup { NameTr = r.NameTr };
            if (r.Id is null) product.OptionGroups.Add(group);
            group.NameTr = r.NameTr.Trim();
            group.NameEn = r.NameEn.Clean();
            group.IsRequired = r.IsRequired;
            group.MinSelect = r.IsRequired ? 1 : 0;
            group.MaxSelect = r.MaxSelect;
            group.SortOrder = i + 1;

            var optionsById = group.Options.ToDictionary(o => o.Id);
            var keepOptions = r.Options.Where(o => o.Id is not null).Select(o => o.Id!.Value).ToHashSet();
            group.Options.RemoveAll(o => !keepOptions.Contains(o.Id));
            for (var j = 0; j < r.Options.Length; j++)
            {
                var ro = r.Options[j];
                var option = ro.Id is { } oid ? optionsById[oid] : new Option { NameTr = ro.NameTr };
                if (ro.Id is null) group.Options.Add(option);
                option.NameTr = ro.NameTr.Trim();
                option.NameEn = ro.NameEn.Clean();
                option.PriceDelta = ro.PriceDelta;
                option.SortOrder = j + 1;
            }
        }
        return null;
    }

    private async Task<int> NextProductOrder(int categoryId, CancellationToken ct) =>
        (await db.Products.IgnoreQueryFilters().Where(p => p.CategoryId == categoryId).MaxAsync(p => (int?)p.SortOrder, ct) ?? 0) + 1;
}
