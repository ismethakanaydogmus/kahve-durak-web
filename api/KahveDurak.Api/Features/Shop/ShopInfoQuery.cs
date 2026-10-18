using System.Globalization;
using KahveDurak.Api.Data;
using KahveDurak.Api.Data.Entities;
using KahveDurak.Api.Features.Catalog;
using Microsoft.EntityFrameworkCore;

namespace KahveDurak.Api.Features.Shop;

public class ShopInfoQuery(AppDbContext db, TimeProvider clock)
{
    public const string ShopName = "Kahve Durak";

    public async Task<ShopStatus> GetStatusAsync(CancellationToken ct)
    {
        var hours = await db.OpeningHours.AsNoTracking().ToListAsync(ct);
        return ShopClock.GetStatus(hours, clock.GetUtcNow());
    }

    public async Task<ShopInfoDto> GetAsync(CancellationToken ct)
    {
        var hours = await db.OpeningHours.AsNoTracking().OrderBy(h => h.Day).ToListAsync(ct);
        var settings = await db.Settings.AsNoTracking().ToDictionaryAsync(s => s.Key, s => s.Value, ct);

        string Get(string key) => settings.GetValueOrDefault(key, "");
        decimal Money(string key) => decimal.TryParse(Get(key), CultureInfo.InvariantCulture, out var v) ? v : 0m;

        return new ShopInfoDto(
            ShopName, Get(SettingKeys.ShopAddress), Get(SettingKeys.ShopPhone), Get(SettingKeys.MapEmbedUrl),
            hours.Select(h => h.ToDto()).ToList(),
            ShopClock.GetStatus(hours, clock.GetUtcNow()).ToDto(),
            Money(SettingKeys.DeliveryFee), Money(SettingKeys.MinOrderAmount));
    }
}
