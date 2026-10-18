using KahveDurak.Api.Data;
using KahveDurak.Api.Data.Entities;
using KahveDurak.Api.Features.Shop;
using Microsoft.EntityFrameworkCore;

namespace KahveDurak.Api.Features.Orders;

/// <summary>Prices a cart and checks every ordering rule on the server. Quote and order creation share this code.</summary>
public class CheckoutService(AppDbContext db, ShopInfoQuery shopInfo, TimeProvider clock)
{
    public const int MaxQuantity = 20;
    public const int MaxNoteLength = 500;

    private sealed record PricedLine(QuoteLineDto Dto, List<Option> Options);

    private sealed record Evaluation(QuoteDto Quote, List<PricedLine> Lines, Address? Address);

    public async Task<QuoteDto> QuoteAsync(int userId, CheckoutRequest req, CancellationToken ct) =>
        (await EvaluateAsync(userId, req, ct)).Quote;

    /// <summary>Returns an unsaved PendingPayment order when the cart passes every rule.</summary>
    public async Task<(Order? Order, QuoteDto Quote)> BuildOrderAsync(int userId, CheckoutRequest req, CancellationToken ct)
    {
        var eval = await EvaluateAsync(userId, req, ct);
        if (!eval.Quote.CanOrder) return (null, eval.Quote);

        var now = clock.GetUtcNow();
        var order = new Order
        {
            UserId = userId,
            Status = OrderStatus.PendingPayment,
            Fulfilment = req.Fulfilment,
            Subtotal = eval.Quote.Subtotal,
            DeliveryFee = eval.Quote.DeliveryFee,
            Total = eval.Quote.Total,
            Note = string.IsNullOrWhiteSpace(req.Note) ? null : req.Note.Trim(),
            AddressTitle = eval.Address?.Title,
            AddressNeighborhood = eval.Address?.Neighborhood?.Name,
            AddressLine = eval.Address?.Line,
            AddressDirections = eval.Address?.Directions,
            CreatedAt = now,
            UpdatedAt = now,
            Items = eval.Lines.Select(l => new OrderItem
            {
                ProductId = l.Dto.ProductId,
                NameTr = l.Dto.NameTr,
                NameEn = l.Dto.NameEn,
                UnitPrice = l.Dto.UnitPrice,
                Quantity = l.Dto.Quantity,
                LineTotal = l.Dto.LineTotal,
                Options = l.Options.Select(o => new OrderItemOption
                {
                    OptionId = o.Id, NameTr = o.NameTr, NameEn = o.NameEn, PriceDelta = o.PriceDelta
                }).ToList(),
            }).ToList(),
            History = [new OrderStatusHistory { Status = OrderStatus.PendingPayment, At = now }],
        };
        return (order, eval.Quote);
    }

    private async Task<Evaluation> EvaluateAsync(int userId, CheckoutRequest req, CancellationToken ct)
    {
        var shop = await shopInfo.GetAsync(ct);
        var errors = new List<QuoteErrorDto>();
        var items = req.Items ?? [];

        if (items.Length == 0)
            return new Evaluation(new QuoteDto([], 0, 0, 0, shop.MinOrderAmount, [new(QuoteErrors.EmptyCart)]), [], null);

        var productIds = items.Select(i => i.ProductId).Distinct().ToList();
        // The global filter hides deleted products, so they count as unavailable.
        var products = await db.Products.AsNoTracking().AsSplitQuery()
            .Include(p => p.Category).Include(p => p.OptionGroups).ThenInclude(g => g.Options)
            .Where(p => productIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, ct);

        var lines = new List<PricedLine>();
        foreach (var item in items)
        {
            if (item.Quantity is < 1 or > MaxQuantity)
            {
                errors.Add(new(QuoteErrors.QuantityInvalid, item.ProductId));
                continue;
            }
            // Sold out, deleted (query filter) or in a category the admin has hidden.
            if (!products.TryGetValue(item.ProductId, out var product) || !product.IsAvailable || product.Category is not { IsActive: true })
            {
                errors.Add(new(QuoteErrors.ProductUnavailable, item.ProductId));
                continue;
            }
            var selected = SelectOptions(product, item.OptionIds ?? [], out var optionError);
            if (optionError is not null)
            {
                errors.Add(new(optionError, item.ProductId));
                continue;
            }

            var unit = product.Price + selected.Sum(o => o.PriceDelta);
            lines.Add(new PricedLine(
                new QuoteLineDto(product.Id, product.NameTr, product.NameEn,
                    selected.Select(o => new OptionNameDto(o.NameTr, o.NameEn)).ToList(),
                    unit, item.Quantity, unit * item.Quantity),
                selected));
        }

        Address? address = null;
        if (req.Fulfilment == Fulfilment.Delivery)
        {
            if (req.AddressId is null)
            {
                errors.Add(new(QuoteErrors.AddressRequired));
            }
            else
            {
                address = await db.Addresses.AsNoTracking().Include(a => a.Neighborhood)
                    .SingleOrDefaultAsync(a => a.Id == req.AddressId && a.UserId == userId, ct);
                if (address is null) errors.Add(new(QuoteErrors.AddressInvalid));
                else if (address.Neighborhood is not { IsActive: true }) errors.Add(new(QuoteErrors.NeighborhoodNotServed));
            }
        }

        if (req.Note is { Length: > MaxNoteLength }) errors.Add(new(QuoteErrors.NoteTooLong));
        if (!Enum.IsDefined(req.Fulfilment)) errors.Add(new(QuoteErrors.FulfilmentInvalid));
        if (!shop.Status.IsOpen) errors.Add(new(QuoteErrors.ShopClosed));

        var subtotal = lines.Sum(l => l.Dto.LineTotal);
        var fee = req.Fulfilment == Fulfilment.Delivery ? shop.DeliveryFee : 0m;
        if (req.Fulfilment == Fulfilment.Delivery && lines.Count > 0 && subtotal < shop.MinOrderAmount)
            errors.Add(new(QuoteErrors.BelowMinimum));

        var quote = new QuoteDto(lines.Select(l => l.Dto).ToList(), subtotal, fee, subtotal + fee, shop.MinOrderAmount, errors);
        return new Evaluation(quote, lines, address);
    }

    /// <summary>Selected options in display order, or an error code when the selection breaks a group's rules.</summary>
    private static List<Option> SelectOptions(Product product, int[] optionIds, out string? error)
    {
        error = null;
        var ids = optionIds.Distinct().ToHashSet();
        var known = product.OptionGroups.SelectMany(g => g.Options).Select(o => o.Id).ToHashSet();
        if (!ids.IsSubsetOf(known))
        {
            error = QuoteErrors.OptionInvalid;
            return [];
        }

        var selected = new List<Option>();
        foreach (var group in product.OptionGroups.OrderBy(g => g.SortOrder))
        {
            var chosen = group.Options.Where(o => ids.Contains(o.Id)).OrderBy(o => o.SortOrder).ToList();
            if (chosen.Count > group.MaxSelect)
            {
                error = QuoteErrors.OptionInvalid;
                return [];
            }
            if (group.IsRequired && chosen.Count < Math.Max(1, group.MinSelect))
            {
                error = QuoteErrors.OptionRequired;
                return [];
            }
            selected.AddRange(chosen);
        }
        return selected;
    }
}
