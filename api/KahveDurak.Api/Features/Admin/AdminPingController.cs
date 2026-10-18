using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KahveDurak.Api.Features.Admin;

[ApiController]
[Route("api/admin")]
[Authorize(Policy = AuthPolicies.Admin)]
public class AdminPingController : ControllerBase
{
    [HttpGet("ping")]
    public IActionResult Ping() => Ok("pong");
}

public static class AuthPolicies
{
    public const string Admin = "Admin";
}
