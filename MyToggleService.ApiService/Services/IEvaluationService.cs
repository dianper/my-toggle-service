using MyToggleService.ApiService.Models;

namespace MyToggleService.ApiService.Services;

public interface IEvaluationService
{
    Task<ServiceResult> EvaluateSingleAsync(Guid applicationId, string key, Guid? tenantId, CancellationToken cancellationToken);
    Task<ServiceResult> EvaluateBatchAsync(EvaluateToggleBatchRequest request, CancellationToken cancellationToken);
}
