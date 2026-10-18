using System.Globalization;
using KahveDurak.Api.Data;
using KahveDurak.Api.Features.Addresses;
using KahveDurak.Api.Features.Catalog;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KahveDurak.Api.Features.Shop;

[ApiController]
[Route("api/shop")]
public class ShopController(ShopInfoQuery shopInfo, AppDbContext db) : ControllerBase
{
    private static readonly StringComparer Turkish = StringComparer.Create(new CultureInfo("tr-TR"), ignoreCase: false);

    [HttpGet("status")]
    public async Task<ShopStatusDto> Status(CancellationToken ct) => (await shopInfo.GetStatusAsync(ct)).ToDto();

    [HttpGet("neighborhoods")]
    public async Task<List<NeighborhoodDto>> Neighborhoods(CancellationToken ct)
    {
        var active = await db.DeliveryNeighborhoods.AsNoTracking().Where(n => n.IsActive).ToListAsync(ct);
        return active.OrderBy(n => n.Name, Turkish).Select(n => new NeighborhoodDto(n.Id, n.Name)).ToList();
    }
}
