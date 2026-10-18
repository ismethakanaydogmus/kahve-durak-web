using KahveDurak.Api.Data.Entities;
using KahveDurak.Api.Data.Seed;
using KahveDurak.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace KahveDurak.Api.Tests.Data;

[Collection("postgres")]
public class SeedTests(ApiFactory factory) : IAsyncLifetime
{
    public Task InitializeAsync() => factory.ResetDatabaseAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task Seeds_four_categories_in_order()
    {
        await using var db = factory.CreateDbContext();

        var names = await db.Categories.OrderBy(c => c.SortOrder).Select(c => c.NameTr).ToListAsync();

        Assert.Equal(["Sıcak İçecekler", "Soğuk Kahveler", "Soğuk İçecekler", "Çaylar"], names);
    }

    [Fact]
    public async Task Espresso_has_double_option_plus_20()
    {
        await using var db = factory.CreateDbContext();

        var espresso = await db.Products.Include(p => p.OptionGroups).ThenInclude(g => g.Options)
            .SingleAsync(p => p.NameTr == "Espresso");

        Assert.Equal(95m, espresso.Price);
        var size = Assert.Single(espresso.OptionGroups);
        Assert.True(size.IsRequired);
        Assert.Equal(20m, size.Options.Single(o => o.NameTr == "Double").PriceDelta);
    }

    [Fact]
    public async Task Latte_has_required_milk_and_size_groups()
    {
        await using var db = factory.CreateDbContext();

        var latte = await db.Products.Include(p => p.OptionGroups).ThenInclude(g => g.Options)
            .SingleAsync(p => p.NameTr == "Latte");

        var milk = latte.OptionGroups.Single(g => g.NameTr == "Süt");
        var size = latte.OptionGroups.Single(g => g.NameTr == "Boy");
        Assert.True(milk.IsRequired);
        Assert.True(size.IsRequired);
        Assert.Equal(30m, milk.Options.Single(o => o.NameTr == "Yulaf").PriceDelta);
        Assert.Equal(40m, size.Options.Single(o => o.NameTr == "Large").PriceDelta);
        Assert.False(latte.OptionGroups.Single(g => g.NameTr == "Ekstra").IsRequired);
    }

    [Fact]
    public async Task Seeds_33_active_neighborhoods_including_Bulgurlu()
    {
        await using var db = factory.CreateDbContext();

        Assert.Equal(33, await db.DeliveryNeighborhoods.CountAsync(n => n.IsActive));
        Assert.True(await db.DeliveryNeighborhoods.AnyAsync(n => n.Name == "Bulgurlu"));
    }

    [Fact]
    public async Task Seeds_all_days_10_to_03()
    {
        await using var db = factory.CreateDbContext();

        var hours = await db.OpeningHours.ToListAsync();

        Assert.Equal(7, hours.Count);
        Assert.All(hours, h =>
        {
            Assert.Equal(new TimeOnly(10, 0), h.Opens);
            Assert.Equal(new TimeOnly(3, 0), h.Closes);
            Assert.False(h.IsClosed);
        });
    }

    [Fact]
    public async Task Seeds_published_sample_reviews_in_order()
    {
        await using var db = factory.CreateDbContext();

        var reviews = await db.Testimonials.OrderBy(t => t.SortOrder).ToListAsync();

        Assert.Equal(6, reviews.Count);
        Assert.All(reviews, r => Assert.True(r.IsPublished));
        Assert.All(reviews, r => Assert.InRange(r.Rating, 4, 5));
        Assert.Equal("Zeynep K.", reviews[0].AuthorName);
        Assert.Contains(reviews, r => r.AuthorName == "Mert A." && r.Text.Contains("kutu oyunu"));
    }

    [Fact]
    public async Task Seeds_board_games_slide()
    {
        await using var db = factory.CreateDbContext();

        var slide = await db.Slides.SingleAsync(s => s.ImageUrl == "/seed/slide-4.svg");

        Assert.Equal("Kahven yanında kutu oyunları", slide.TitleTr);
        Assert.Equal("Board games with your coffee", slide.TitleEn);
        Assert.Equal(4, slide.SortOrder);
    }

    [Fact]
    public async Task Seed_is_idempotent()
    {
        await using var db = factory.CreateDbContext();
        var categories = await db.Categories.CountAsync();
        var products = await db.Products.CountAsync();
        var config = factory.Services.GetRequiredService<IConfiguration>();

        await DbSeeder.SeedAsync(db, config, CancellationToken.None);

        Assert.Equal(categories, await db.Categories.CountAsync());
        Assert.Equal(products, await db.Products.CountAsync());
        Assert.Equal(1, await db.Users.CountAsync(u => u.Role == Roles.Admin));
    }

    [Fact]
    public async Task Creates_admin_when_password_configured()
    {
        await using var db = factory.CreateDbContext();

        var admin = await db.Users.SingleAsync(u => u.Email == ApiFactory.AdminEmail);

        Assert.Equal(Roles.Admin, admin.Role);
        Assert.True(BCrypt.Net.BCrypt.Verify(ApiFactory.AdminPassword, admin.PasswordHash));
    }
}
