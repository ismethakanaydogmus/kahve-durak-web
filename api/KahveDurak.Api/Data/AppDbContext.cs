using KahveDurak.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace KahveDurak.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<OptionGroup> OptionGroups => Set<OptionGroup>();
    public DbSet<Option> Options => Set<Option>();
    public DbSet<Slide> Slides => Set<Slide>();
    public DbSet<Testimonial> Testimonials => Set<Testimonial>();
    public DbSet<OpeningHour> OpeningHours => Set<OpeningHour>();
    public DbSet<Setting> Settings => Set<Setting>();
    public DbSet<DeliveryNeighborhood> DeliveryNeighborhoods => Set<DeliveryNeighborhood>();
    public DbSet<Address> Addresses => Set<Address>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<OrderStatusHistory> OrderStatusHistory => Set<OrderStatusHistory>();

    protected override void ConfigureConventions(ModelConfigurationBuilder builder)
    {
        builder.Properties<decimal>().HavePrecision(10, 2);
    }

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<User>(e =>
        {
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.Email).HasMaxLength(256);
            e.Property(u => u.Role).HasMaxLength(32);
        });

        b.Entity<Product>(e =>
        {
            e.HasQueryFilter(p => !p.IsDeleted);
            e.HasOne(p => p.Category).WithMany(c => c.Products)
                .HasForeignKey(p => p.CategoryId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(p => p.OptionGroups).WithOne()
                .HasForeignKey(g => g.ProductId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<OptionGroup>().HasMany(g => g.Options).WithOne()
            .HasForeignKey(o => o.OptionGroupId).OnDelete(DeleteBehavior.Cascade);

        b.Entity<OpeningHour>().HasIndex(h => h.Day).IsUnique();
        b.Entity<Setting>().HasKey(s => s.Key);
        b.Entity<DeliveryNeighborhood>().HasIndex(n => n.Name).IsUnique();

        b.Entity<Address>(e =>
        {
            e.Property(a => a.Title).HasMaxLength(40);
            e.Property(a => a.Line).HasMaxLength(200);
            e.Property(a => a.Directions).HasMaxLength(200);
            e.HasOne(a => a.User).WithMany().HasForeignKey(a => a.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(a => a.Neighborhood).WithMany().HasForeignKey(a => a.NeighborhoodId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(a => a.UserId);
        });

        b.Entity<Order>(e =>
        {
            e.Property(o => o.Status).HasConversion<string>().HasMaxLength(24);
            e.Property(o => o.Fulfilment).HasConversion<string>().HasMaxLength(24);
            e.Property(o => o.Note).HasMaxLength(500);
            e.Property(o => o.PaymentToken).HasMaxLength(200);
            e.HasIndex(o => o.PaymentToken).IsUnique();
            e.HasIndex(o => new { o.UserId, o.CreatedAt });
            e.HasOne(o => o.User).WithMany().HasForeignKey(o => o.UserId).OnDelete(DeleteBehavior.Restrict);
            e.HasMany(o => o.Items).WithOne().HasForeignKey(i => i.OrderId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(o => o.History).WithOne().HasForeignKey(h => h.OrderId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<OrderItem>().HasMany(i => i.Options).WithOne().HasForeignKey(o => o.OrderItemId).OnDelete(DeleteBehavior.Cascade);
        b.Entity<OrderStatusHistory>().Property(h => h.Status).HasConversion<string>().HasMaxLength(24);
    }
}
