using KahveDurak.Api.Data;
using KahveDurak.Api.Data.Entities;
using KahveDurak.Api.Features.Orders;
using KahveDurak.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KahveDurak.Api.Tests.Data;

[Collection("postgres")]
public class MigrationTests(ApiFactory factory)
{
    [Fact]
    public async Task Product_with_option_groups_round_trips()
    {
        int productId;
        await using (var db = factory.CreateDbContext())
        {
            var product = new Product
            {
                NameTr = "Test Espresso",
                Price = 120.50m,
                Category = new Category { NameTr = "Test Kategori" },
                OptionGroups =
                [
                    new OptionGroup
                    {
                        NameTr = "Boy", IsRequired = true, MinSelect = 1, MaxSelect = 1,
                        Options = [new Option { NameTr = "Single", PriceDelta = 0m }, new Option { NameTr = "Double", PriceDelta = 15m }]
                    }
                ]
            };
            db.Products.Add(product);
            await db.SaveChangesAsync();
            productId = product.Id;
        }

        await using (var db = factory.CreateDbContext())
        {
            var loaded = await db.Products
                .Include(p => p.OptionGroups).ThenInclude(g => g.Options)
                .SingleAsync(p => p.Id == productId);

            Assert.Equal(120.50m, loaded.Price);
            var options = loaded.OptionGroups.Single().Options;
            Assert.Equal(2, options.Count);
            Assert.Equal(15m, options.Single(o => o.NameTr == "Double").PriceDelta);
        }
    }

    [Fact]
    public async Task Order_with_items_options_and_history_round_trips()
    {
        int orderId;
        await using (var db = factory.CreateDbContext())
        {
            var user = new User
            {
                FirstName = "Ali", LastName = "Y", Email = $"order-{Guid.NewGuid():N}@x.com", Phone = "+905551112233",
                PasswordHash = "x"
            };
            var order = new Order
            {
                User = user, Status = OrderStatus.Received, Fulfilment = Fulfilment.Delivery,
                Subtotal = 390.50m, DeliveryFee = 30m, Total = 420.50m, AddressNeighborhood = "Bulgurlu",
                Items =
                [
                    new OrderItem
                    {
                        ProductId = 1, NameTr = "Latte", UnitPrice = 210.25m, Quantity = 2, LineTotal = 420.50m,
                        Options = [new OrderItemOption { OptionId = 1, NameTr = "Yulaf", PriceDelta = 30m }]
                    }
                ],
                History = [new OrderStatusHistory { Status = OrderStatus.PendingPayment }, new OrderStatusHistory { Status = OrderStatus.Received }]
            };
            db.Orders.Add(order);
            await db.SaveChangesAsync();
            orderId = order.Id;
        }

        await using (var db = factory.CreateDbContext())
        {
            var loaded = await db.Orders
                .Include(o => o.Items).ThenInclude(i => i.Options)
                .Include(o => o.History)
                .SingleAsync(o => o.Id == orderId);

            Assert.Equal(420.50m, loaded.Total);
            Assert.Equal(210.25m, loaded.Items.Single().UnitPrice);
            Assert.Equal("Yulaf", loaded.Items.Single().Options.Single().NameTr);
            Assert.Equal(2, loaded.History.Count);
            Assert.Equal(Fulfilment.Delivery, loaded.Fulfilment);

            var raw = await db.Database.SqlQuery<string>($"SELECT \"Status\" AS \"Value\" FROM \"Orders\" WHERE \"Id\" = {orderId}").SingleAsync();
            Assert.Equal("Received", raw);
        }
    }

    [Fact]
    public async Task Soft_deleted_product_is_filtered()
    {
        await using var db = factory.CreateDbContext();
        var product = new Product { NameTr = "Silinmiş", Price = 10m, IsDeleted = true, Category = new Category { NameTr = "K" } };
        db.Products.Add(product);
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();

        Assert.False(await db.Products.AnyAsync(p => p.Id == product.Id));
        Assert.True(await db.Products.IgnoreQueryFilters().AnyAsync(p => p.Id == product.Id));
    }
}
