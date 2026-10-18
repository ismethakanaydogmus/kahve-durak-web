using KahveDurak.Api.Data;
using KahveDurak.Api.Data.Entities;
using KahveDurak.Api.Features.Auth;
using KahveDurak.Api.Features.Payments;
using KahveDurak.Api.Features.Shop;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KahveDurak.Api.Features.Orders;

public record CreateOrderResponse(int OrderId, string PaymentPageUrl);

[ApiController]
[Authorize]
[Route("api/orders")]
public class OrdersController(
    AppDbContext db, CheckoutService checkout, IPaymentGateway gateway, ShopInfoQuery shopInfo, TimeProvider clock) : ControllerBase
{
    // iyzico requires a buyer IP; this is the sample from its docs, used when the connection has none (tests).
    private const string FallbackIp = "85.34.78.112";

    /// <summary>Always 200: rule violations come back in <see cref="QuoteDto.Errors"/>.</summary>
    [HttpPost("quote")]
    public async Task<ActionResult<QuoteDto>> Quote(CheckoutRequest request, CancellationToken ct)
    {
        if (User.UserId() is not { } userId) return Unauthorized();
        return await checkout.QuoteAsync(userId, request, ct);
    }

    /// <summary>Orders left unpaid this long are abandoned checkouts and are hidden from the list.</summary>
    public static readonly TimeSpan StalePendingAfter = TimeSpan.FromMinutes(30);

    [HttpGet]
    public async Task<ActionResult<List<OrderSummaryDto>>> List(CancellationToken ct)
    {
        if (User.UserId() is not { } userId) return Unauthorized();
        var staleBefore = clock.GetUtcNow() - StalePendingAfter;
        return await db.Orders.AsNoTracking()
            .Where(o => o.UserId == userId && !(o.Status == OrderStatus.PendingPayment && o.CreatedAt < staleBefore))
            .OrderByDescending(o => o.CreatedAt).ThenByDescending(o => o.Id)
            .Select(o => new OrderSummaryDto(o.Id, o.Status, o.Fulfilment, o.Total, o.Items.Sum(i => i.Quantity), o.CreatedAt))
            .ToListAsync(ct);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<OrderDetailDto>> Detail(int id, CancellationToken ct)
    {
        if (User.UserId() is not { } userId) return Unauthorized();
        var order = await db.Orders.AsNoTracking().AsSplitQuery()
            .Include(o => o.Items).ThenInclude(i => i.Options).Include(o => o.History)
            .SingleOrDefaultAsync(o => o.Id == id && o.UserId == userId, ct);
        return order is null ? NotFound() : order.ToDetail();
    }

    [HttpPost]
    public async Task<IActionResult> Create(CheckoutRequest request, CancellationToken ct)
    {
        if (User.UserId() is not { } userId) return Unauthorized();
        var (order, quote) = await checkout.BuildOrderAsync(userId, request, ct);
        if (order is null) return UnprocessableEntity(quote);

        db.Orders.Add(order);
        await db.SaveChangesAsync(ct);

        var buyer = await db.Users.FindAsync([userId], ct);
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? FallbackIp;
        var shopAddress = (await shopInfo.GetAsync(ct)).Address;
        var init = await gateway.InitializeAsync(new PaymentInitRequest(order, buyer!, request.Lang == "en" ? "en" : "tr", ip, shopAddress), ct);

        if (!init.Success || init.Token is null || init.PaymentPageUrl is null)
        {
            var now = clock.GetUtcNow();
            order.Status = OrderStatus.PaymentFailed;
            order.UpdatedAt = now;
            order.History.Add(new OrderStatusHistory { Status = OrderStatus.PaymentFailed, At = now });
            await db.SaveChangesAsync(ct);
            return Problem(statusCode: StatusCodes.Status502BadGateway, title: "Ödeme başlatılamadı. Biraz sonra tekrar dene.");
        }

        order.PaymentToken = init.Token;
        await db.SaveChangesAsync(ct);
        return StatusCode(StatusCodes.Status201Created, new CreateOrderResponse(order.Id, init.PaymentPageUrl));
    }
}
