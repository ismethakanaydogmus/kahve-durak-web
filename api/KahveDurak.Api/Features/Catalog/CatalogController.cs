using KahveDurak.Api.Data;
using KahveDurak.Api.Features.Shop;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KahveDurak.Api.Features.Catalog;

[ApiController]
[Route("api")]
public class CatalogController(AppDbContext db, ShopInfoQuery shopInfo) : ControllerBase
{
    [HttpGet("menu")]
    public async Task<List<MenuCategoryDto>> Menu(CancellationToken ct)
    {
        var categories = await db.Categories.AsNoTracking().AsSplitQuery()
            .Where(c => c.IsActive)
            .Include(c => c.Products).ThenInclude(p => p.OptionGroups).ThenInclude(g => g.Options)
            .OrderBy(c => c.SortOrder)
            .ToListAsync(ct);

        return categories.Select(c => c.ToDto()).ToList();
    }

    [HttpGet("home")]
    public async Task<HomeDto> Home(CancellationToken ct)
    {
        var slides = await db.Slides.AsNoTracking().Where(s => s.IsActive).OrderBy(s => s.SortOrder).ToListAsync(ct);
        var categories = await db.Categories.AsNoTracking().Where(c => c.IsActive).OrderBy(c => c.SortOrder).ToListAsync(ct);
        var featured = await db.Products.AsNoTracking().AsSplitQuery()
            .Where(p => p.IsFeatured && p.IsAvailable && p.Category!.IsActive)
            .Include(p => p.OptionGroups).ThenInclude(g => g.Options)
            .OrderBy(p => p.Category!.SortOrder).ThenBy(p => p.SortOrder)
            .ToListAsync(ct);
        var testimonials = await db.Testimonials.AsNoTracking().Where(t => t.IsPublished).OrderBy(t => t.SortOrder).ToListAsync(ct);

        return new HomeDto(
            slides.Select(s => s.ToDto()).ToList(),
            categories.Select(c => c.ToDto(withProducts: false)).ToList(),
            featured.Select(p => p.ToDto()).ToList(),
            testimonials.Select(t => t.ToDto()).ToList(),
            await shopInfo.GetAsync(ct));
    }
}
