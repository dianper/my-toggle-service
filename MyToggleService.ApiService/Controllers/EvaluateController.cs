using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyToggleService.ApiService.Models;
using MyToggleService.ApiService.Services;

namespace MyToggleService.ApiService.Controllers;

[ApiController]
[Authorize]
[Route("api/evaluate")]
public sealed class EvaluateController(IEvaluationService evaluationService) : ControllerBase
{
    [HttpGet("single")]
    public async Task<IActionResult> Single(
        [FromQuery] Guid applicationId,
        [FromQuery] string key,
        [FromQuery] Guid? tenantId,
        CancellationToken cancellationToken)
    {
        return ToActionResult(await evaluationService.EvaluateSingleAsync(applicationId, key, tenantId, cancellationToken));
    }

    [HttpPost("batch")]
    public async Task<IActionResult> Batch([FromBody] EvaluateToggleBatchRequest request, CancellationToken cancellationToken)
    {
        return ToActionResult(await evaluationService.EvaluateBatchAsync(request, cancellationToken));
    }

    private IActionResult ToActionResult(ServiceResult result)
    {
        if (result.Payload is null)
        {
            return StatusCode(result.StatusCode);
        }

        return StatusCode(result.StatusCode, result.Payload);
    }
}
