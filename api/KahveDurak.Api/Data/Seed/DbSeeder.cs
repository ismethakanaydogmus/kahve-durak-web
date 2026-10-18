using KahveDurak.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace KahveDurak.Api.Data.Seed;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db, IConfiguration config, CancellationToken ct, ILogger? logger = null)
    {
        if (!await db.Categories.IgnoreQueryFilters().AnyAsync(ct))
            db.Categories.AddRange(MenuSeed.Build());

        if (!await db.OpeningHours.AnyAsync(ct))
            db.OpeningHours.AddRange(ShopSeed.OpeningHours());

        if (!await db.Settings.AnyAsync(ct))
            db.Settings.AddRange(ShopSeed.Settings());

        if (!await db.DeliveryNeighborhoods.AnyAsync(ct))
            db.DeliveryNeighborhoods.AddRange(ShopSeed.UskudarNeighborhoods.Select(n => new DeliveryNeighborhood { Name = n }));

        if (!await db.Slides.AnyAsync(ct))
            db.Slides.AddRange(ShopSeed.Slides());

        if (!await db.Testimonials.AnyAsync(ct))
            db.Testimonials.AddRange(ShopSeed.Testimonials());

        var adminEmail = (config["Admin:Email"] ?? "admin@kahvedurak.local").Trim().ToLowerInvariant();
        var adminPassword = config["Admin:Password"];
        if (string.IsNullOrWhiteSpace(adminPassword))
        {
            logger?.LogWarning("Admin:Password is not configured; no admin user was seeded.");
        }
        else if (!await db.Users.AnyAsync(u => u.Email == adminEmail, ct))
        {
            db.Users.Add(new User
            {
                FirstName = "Admin", LastName = "Kahve Durak", Email = adminEmail, Phone = "",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword, workFactor: 11), Role = Roles.Admin
            });
        }

        await db.SaveChangesAsync(ct);
    }
}
