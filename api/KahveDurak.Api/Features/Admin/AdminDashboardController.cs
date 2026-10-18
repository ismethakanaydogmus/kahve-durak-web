using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KahveDurak.Api.Features.Admin;

[ApiController]
[Authorize(Policy = AuthPolicies.Admin)]
[Route("api/admin/dashboard")]
public class AdminDashboardController(DashboardQuery dashboard) : ControllerBase
{
    [HttpGet]
    public Task<DashboardDto> Get(CancellationToken ct) => dashboard.GetAsync(ct);
}
