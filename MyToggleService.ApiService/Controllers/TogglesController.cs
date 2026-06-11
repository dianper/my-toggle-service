using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyToggleService.ApiService.Models;
using MyToggleService.ApiService.Services;

namespace MyToggleService.ApiService.Controllers;

[ApiController]
[Authorize]
[Route("api/toggles")]
public sealed class TogglesController(IToggleService toggleService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] Guid? applicationId,
        [FromQuery] Guid? tenantId,
        [FromQuery] bool includeGlobal,
        CancellationToken cancellationToken)
    {
        return ToActionResult(await toggleService.ListAsync(applicationId, tenantId, includeGlobal, cancellationToken));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateToggleRequest request, CancellationToken cancellationToken)
    {
        return ToActionResult(await toggleService.CreateAsync(request, cancellationToken));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateToggleRequest request, CancellationToken cancellationToken)
    {
        return ToActionResult(await toggleService.UpdateAsync(id, request, cancellationToken));
    }

    [HttpPut("groups")]
    public async Task<IActionResult> UpdateGroup([FromBody] UpdateToggleGroupRequest request, CancellationToken cancellationToken)
    {
        return ToActionResult(await toggleService.UpdateGroupAsync(request, cancellationToken));
    }

    [HttpPatch("{id:guid}/enabled")]
    public async Task<IActionResult> SetEnabled(Guid id, [FromBody] SetToggleEnabledRequest request, CancellationToken cancellationToken)
    {
        return ToActionResult(await toggleService.SetEnabledAsync(id, request, cancellationToken));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        return ToActionResult(await toggleService.DeleteAsync(id, cancellationToken));
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
