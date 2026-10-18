using System.Globalization;
using KahveDurak.Api.Data;
using KahveDurak.Api.Data.Entities;
using KahveDurak.Api.Features.Catalog;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KahveDurak.Api.Features.Admin.Settings;

public record AdminNeighborhoodDto(int Id, string Name, bool IsActive);

public record ShopSettingsDto(
    decimal DeliveryFee, decimal MinOrderAmount, string Phone, string Address, string MapEmbedUrl,
    List<OpeningHourDto> OpeningHours, List<AdminNeighborhoodDto> Neighborhoods);

public class ShopSettingsValidator : AbstractValidator<ShopSettingsDto>
{
    // The value is written into an <iframe src> on the home page, so only Google Maps is allowed.
    public const string MapPrefix = "https://www.google.com/maps";

    public ShopSettingsValidator()
    {
        RuleFor(x => x.DeliveryFee).GreaterThanOrEqualTo(0).LessThanOrEqualTo(10_000);
        RuleFor(x => x.MinOrderAmount).GreaterThanOrEqualTo(0).LessThanOrEqualTo(100_000);
        RuleFor(x => x.Phone).NotEmpty().MaximumLength(20);
        RuleFor(x => x.Address).NotEmpty().MaximumLength(200);
        RuleFor(x => x.MapEmbedUrl).NotEmpty().MaximumLength(1000)
            .Must(u => u.StartsWith(MapPrefix, StringComparison.Ordinal)).WithMessage("Harita linki Google Maps'ten olmalı.");
        RuleFor(x => x.OpeningHours).NotNull()
            .Must(h => h.Count == 7 && h.Select(d => d.Day).Distinct().Count() == 7 && h.All(d => d.Day is >= 0 and <= 6))
            .WithMessage("Haftanın 7 günü birer kez olmalı.");
        RuleForEach(x => x.OpeningHours).ChildRules(day =>
        {
            day.RuleFor(d => d.Opens).Must(IsTime).WithMessage("Saat SS:dd biçiminde olmalı.");
            day.RuleFor(d => d.Closes).Must(IsTime).WithMessage("Saat SS:dd biçiminde olmalı.");
        });
        RuleFor(x => x.Neighborhoods).NotNull();
    }

    public static bool IsTime(string? s) => TimeOnly.TryParseExact(s, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out _);
}

[ApiController]
[Authorize(Policy = AuthPolicies.Admin)]
[Route("api/admin/settings")]
public class AdminSettingsController(AppDbContext db) : ControllerBase
{
    private static readonly StringComparer Turkish = StringComparer.Create(new CultureInfo("tr-TR"), ignoreCase: false);

    [HttpGet]
    public async Task<ShopSettingsDto> Get(CancellationToken ct)
    {
        var settings = await db.Settings.AsNoTracking().ToDictionaryAsync(s => s.Key, s => s.Value, ct);
        var hours = await db.OpeningHours.AsNoTracking().OrderBy(h => h.Day).ToListAsync(ct);
        var neighborhoods = await db.DeliveryNeighborhoods.AsNoTracking().ToListAsync(ct);
        string Get(string key) => settings.GetValueOrDefault(key, "");
        decimal Money(string key) => decimal.TryParse(Get(key), CultureInfo.InvariantCulture, out var v) ? v : 0m;

        return new ShopSettingsDto(
            Money(SettingKeys.DeliveryFee), Money(SettingKeys.MinOrderAmount), Get(SettingKeys.ShopPhone), Get(SettingKeys.ShopAddress),
            Get(SettingKeys.MapEmbedUrl), hours.Select(h => h.ToDto()).ToList(),
            neighborhoods.OrderBy(n => n.Name, Turkish).Select(n => new AdminNeighborhoodDto(n.Id, n.Name, n.IsActive)).ToList());
    }

    [HttpPut]
    public async Task<IActionResult> Put(ShopSettingsDto request, IValidator<ShopSettingsDto> validator, CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(request, ct);
        if (!validation.IsValid) return ValidationProblem(new ValidationProblemDetails(validation.ToDictionary()));

        var neighborhoods = await db.DeliveryNeighborhoods.ToDictionaryAsync(n => n.Id, ct);
        if (request.Neighborhoods.Any(n => !neighborhoods.ContainsKey(n.Id))) return Problem(statusCode: 400, title: "Bilinmeyen mahalle.");

        await using var tx = await db.Database.BeginTransactionAsync(ct);
        await SetAsync(SettingKeys.DeliveryFee, request.DeliveryFee.ToString(CultureInfo.InvariantCulture), ct);
        await SetAsync(SettingKeys.MinOrderAmount, request.MinOrderAmount.ToString(CultureInfo.InvariantCulture), ct);
        await SetAsync(SettingKeys.ShopPhone, request.Phone.Trim(), ct);
        await SetAsync(SettingKeys.ShopAddress, request.Address.Trim(), ct);
        await SetAsync(SettingKeys.MapEmbedUrl, request.MapEmbedUrl.Trim(), ct);

        var hours = await db.OpeningHours.ToDictionaryAsync(h => (int)h.Day, ct);
        foreach (var d in request.OpeningHours)
        {
            if (!hours.TryGetValue(d.Day, out var row)) db.OpeningHours.Add(row = new OpeningHour { Day = (DayOfWeek)d.Day });
            row.Opens = TimeOnly.ParseExact(d.Opens, "HH:mm", CultureInfo.InvariantCulture);
            row.Closes = TimeOnly.ParseExact(d.Closes, "HH:mm", CultureInfo.InvariantCulture);
            row.IsClosed = d.IsClosed;
        }
        foreach (var n in request.Neighborhoods) neighborhoods[n.Id].IsActive = n.IsActive;

        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return Ok(await Get(ct));
    }

    private async Task SetAsync(string key, string value, CancellationToken ct)
    {
        var row = await db.Settings.SingleOrDefaultAsync(s => s.Key == key, ct);
        if (row is null) db.Settings.Add(new Setting { Key = key, Value = value });
        else row.Value = value;
    }
}
