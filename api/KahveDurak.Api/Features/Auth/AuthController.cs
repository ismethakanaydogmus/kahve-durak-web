using KahveDurak.Api.Data;
using KahveDurak.Api.Data.Entities;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KahveDurak.Api.Features.Auth;

[ApiController]
[Route("api/auth")]
public class AuthController(AppDbContext db, JwtTokenService tokens) : ControllerBase
{
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(
        RegisterRequest request, IValidator<RegisterRequest> validator, CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(request, ct);
        if (!validation.IsValid)
            return ValidationProblem(new ValidationProblemDetails(validation.ToDictionary()));

        var email = EmailNormalizer.Normalize(request.Email);
        if (await db.Users.AnyAsync(u => u.Email == email, ct))
            return Problem(statusCode: StatusCodes.Status409Conflict, title: "Bu e-posta zaten kayıtlı.");

        var user = new User
        {
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Email = email,
            Phone = PhoneNormalizer.Normalize(request.Phone),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password, workFactor: 11),
            Role = Roles.Customer,
        };
        db.Users.Add(user);
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            // Lost a race with a concurrent registration for the same email.
            return Problem(statusCode: StatusCodes.Status409Conflict, title: "Bu e-posta zaten kayıtlı.");
        }

        return StatusCode(StatusCodes.Status201Created, new AuthResponse(tokens.Create(user), UserDto.From(user)));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(
        LoginRequest request, IValidator<LoginRequest> validator, CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(request, ct);
        if (!validation.IsValid)
            return ValidationProblem(new ValidationProblemDetails(validation.ToDictionary()));

        var email = EmailNormalizer.Normalize(request.Email);
        var user = await db.Users.AsNoTracking().SingleOrDefaultAsync(u => u.Email == email, ct);
        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return Problem(statusCode: StatusCodes.Status401Unauthorized, title: "E-posta veya şifre hatalı.");

        return new AuthResponse(tokens.Create(user), UserDto.From(user));
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> Me(CancellationToken ct)
    {
        if (User.UserId() is not { } id) return Unauthorized();

        var user = await db.Users.AsNoTracking().SingleOrDefaultAsync(u => u.Id == id, ct);
        return user is null ? Unauthorized() : UserDto.From(user);
    }
}
