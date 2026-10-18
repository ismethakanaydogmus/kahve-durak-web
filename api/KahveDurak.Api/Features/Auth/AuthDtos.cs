using KahveDurak.Api.Data.Entities;

namespace KahveDurak.Api.Features.Auth;

public record RegisterRequest(string FirstName, string LastName, string Email, string Phone, string Password);

public record LoginRequest(string Email, string Password);

public record UserDto(int Id, string FirstName, string LastName, string Email, string Phone, string Role)
{
    public static UserDto From(User u) => new(u.Id, u.FirstName, u.LastName, u.Email, u.Phone, u.Role);
}

public record AuthResponse(string Token, UserDto User);

public static class EmailNormalizer
{
    public static string Normalize(string? email) => (email ?? "").Trim().ToLowerInvariant();
}
