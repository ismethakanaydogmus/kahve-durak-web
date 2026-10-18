using System.Security.Claims;
using Microsoft.IdentityModel.JsonWebTokens;

namespace KahveDurak.Api.Features.Auth;

public static class ClaimsExtensions
{
    /// <summary>The user id from the JWT "sub" claim, or null when it is missing or malformed.</summary>
    public static int? UserId(this ClaimsPrincipal user) =>
        int.TryParse(user.FindFirst(JwtRegisteredClaimNames.Sub)?.Value, out var id) ? id : null;
}
