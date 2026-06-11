using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyToggleService.ApiService.Models;
using MyToggleService.ApiService.Services;

namespace MyToggleService.ApiService.Controllers;

[ApiController]
[Authorize]
[Route("api/tenants")]
public sealed class TenantsController(ITenantService tenantService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        return ToActionResult(await tenantService.ListAsync(cancellationToken));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTenantRequest request, CancellationToken cancellationToken)
    {
        return ToActionResult(await tenantService.CreateAsync(request, cancellationToken));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTenantRequest request, CancellationToken cancellationToken)
    {
        return ToActionResult(await tenantService.UpdateAsync(id, request, cancellationToken));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        return ToActionResult(await tenantService.DeleteAsync(id, cancellationToken));
    }

    private IActionResult ToActionResult(ServiceResult result)
    {
        if (result.StatusCode == 201)
        {
            return Created(result.Location!, result.Payload);
        }

        if (result.StatusCode == 204)
        {
            return NoContent();
        }

        if (result.Payload is null)
        {
            return StatusCode(result.StatusCode);
        }

        return StatusCode(result.StatusCode, result.Payload);
    }
}
