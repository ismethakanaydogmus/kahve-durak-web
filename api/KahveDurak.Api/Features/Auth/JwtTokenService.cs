using System.Security.Claims;
using System.Text;
using KahveDurak.Api.Data.Entities;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace KahveDurak.Api.Features.Auth;

public class JwtTokenService(IConfiguration config, TimeProvider clock)
{
    public const string Issuer = "kahvedurak-api";
    public const string Audience = "kahvedurak-api";
    public static readonly TimeSpan Lifetime = TimeSpan.FromDays(7);

    public static SymmetricSecurityKey SigningKey(IConfiguration config)
    {
        var secret = config["Jwt:Secret"];
        if (string.IsNullOrEmpty(secret) || Encoding.UTF8.GetByteCount(secret) < 32)
            throw new InvalidOperationException("Jwt:Secret must be configured and at least 32 bytes long.");
        return new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
    }

    public string Create(User user)
    {
        var now = clock.GetUtcNow().UtcDateTime;
        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = Issuer,
            Audience = Audience,
            IssuedAt = now,
            NotBefore = now,
            Expires = now.Add(Lifetime),
            Subject = new ClaimsIdentity(
            [
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim("role", user.Role),
            ]),
            SigningCredentials = new SigningCredentials(SigningKey(config), SecurityAlgorithms.HmacSha256),
        };
        return new JsonWebTokenHandler().CreateToken(descriptor);
    }
}
