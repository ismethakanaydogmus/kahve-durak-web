using KahveDurak.Api.Data;
using KahveDurak.Api.Data.Entities;
using KahveDurak.Api.Features.Auth;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KahveDurak.Api.Features.Addresses;

/// <summary>A customer's own delivery addresses. Other users' addresses answer 404.</summary>
[ApiController]
[Authorize]
[Route("api/addresses")]
public class AddressesController(AppDbContext db, IValidator<AddressRequest> validator) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<AddressDto>>> List(CancellationToken ct)
    {
        if (User.UserId() is not { } userId) return Unauthorized();
        var addresses = await db.Addresses.AsNoTracking().Include(a => a.Neighborhood)
            .Where(a => a.UserId == userId).OrderByDescending(a => a.CreatedAt).ThenByDescending(a => a.Id)
            .ToListAsync(ct);
        return addresses.Select(AddressDto.From).ToList();
    }

    [HttpPost]
    public async Task<ActionResult<AddressDto>> Create(AddressRequest request, CancellationToken ct)
    {
        if (User.UserId() is not { } userId) return Unauthorized();
        if (await ValidateAsync(request, ct) is { } problem) return problem;

        var address = new Address
        {
            UserId = userId, Title = request.Title.Trim(), NeighborhoodId = request.NeighborhoodId,
            Line = request.Line.Trim(), Directions = Clean(request.Directions),
        };
        db.Addresses.Add(address);
        await db.SaveChangesAsync(ct);
        await db.Entry(address).Reference(a => a.Neighborhood).LoadAsync(ct);
        return StatusCode(StatusCodes.Status201Created, AddressDto.From(address));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<AddressDto>> Update(int id, AddressRequest request, CancellationToken ct)
    {
        if (User.UserId() is not { } userId) return Unauthorized();
        var address = await db.Addresses.SingleOrDefaultAsync(a => a.Id == id && a.UserId == userId, ct);
        if (address is null) return NotFound();
        if (await ValidateAsync(request, ct) is { } problem) return problem;

        address.Title = request.Title.Trim();
        address.NeighborhoodId = request.NeighborhoodId;
        address.Line = request.Line.Trim();
        address.Directions = Clean(request.Directions);
        await db.SaveChangesAsync(ct);
        await db.Entry(address).Reference(a => a.Neighborhood).LoadAsync(ct);
        return AddressDto.From(address);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        if (User.UserId() is not { } userId) return Unauthorized();
        // Orders keep an address snapshot, so a real delete is safe.
        var deleted = await db.Addresses.Where(a => a.Id == id && a.UserId == userId).ExecuteDeleteAsync(ct);
        return deleted == 0 ? NotFound() : NoContent();
    }

    private async Task<ActionResult?> ValidateAsync(AddressRequest request, CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(request, ct);
        if (!validation.IsValid)
            return ValidationProblem(new ValidationProblemDetails(validation.ToDictionary()));
        if (!await db.DeliveryNeighborhoods.AnyAsync(n => n.Id == request.NeighborhoodId && n.IsActive, ct))
            return Problem(statusCode: StatusCodes.Status400BadRequest, title: "Bu mahalleye şu an teslimat yapmıyoruz.");
        return null;
    }

    private static string? Clean(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();
}
