using Microsoft.EntityFrameworkCore;
using MyToggleService.ApiService.Data;
using MyToggleService.ApiService.Models;

namespace MyToggleService.ApiService.Services;

public sealed class EvaluationService(ToggleDbContext db) : IEvaluationService
{
    public async Task<ServiceResult> EvaluateSingleAsync(Guid applicationId, string key, Guid? tenantId, CancellationToken cancellationToken)
    {
        var response = await EvaluateToggleAsync(applicationId, key, tenantId, cancellationToken);
        return ServiceResult.Ok(response);
    }

    public async Task<ServiceResult> EvaluateBatchAsync(EvaluateToggleBatchRequest request, CancellationToken cancellationToken)
    {
        var keys = request.Keys.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        var responses = new List<EvaluateToggleResponse>(keys.Count);

        foreach (var key in keys)
        {
            responses.Add(await EvaluateToggleAsync(request.ApplicationId, key, request.TenantId, cancellationToken));
        }

        return ServiceResult.Ok(new
        {
            request.ApplicationId,
            request.TenantId,
            timestamp = DateTimeOffset.UtcNow,
            toggles = responses
        });
    }

    private async Task<EvaluateToggleResponse> EvaluateToggleAsync(
        Guid applicationId,
        string key,
        Guid? tenantId,
        CancellationToken cancellationToken)
    {
        var query = db.FeatureToggles
            .AsNoTracking()
            .Where(x => x.ApplicationId == applicationId && x.Key == key);

        if (tenantId is not null)
        {
            query = query.Where(x => x.TenantId == tenantId || x.TenantId == null);
        }
        else
        {
            query = query.Where(x => x.TenantId == null);
        }

        var resolved = await query
            .OrderByDescending(x => x.TenantId == tenantId)
            .ThenByDescending(x => x.UpdatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (resolved is null)
        {
            return new EvaluateToggleResponse(key, applicationId, tenantId, false, "default-disabled");
        }

        var resolution = resolved.TenantId == tenantId ? "tenant-specific" : "global";
        return new EvaluateToggleResponse(key, applicationId, resolved.TenantId, resolved.IsEnabled, resolution);
    }
}
