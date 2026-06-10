using MyToggleService.Client.Models;

namespace MyToggleService.Client;

public interface IMyToggleServiceClient
{
    Task<EvaluateToggleResponse> EvaluateAsync(
        Guid applicationId,
        string key,
        Guid? tenantId = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<EvaluateToggleResponse>> EvaluateBatchAsync(
        Guid applicationId,
        IEnumerable<string> keys,
        Guid? tenantId = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ToggleDto>> ListTogglesAsync(
        Guid? applicationId = null,
        Guid? tenantId = null,
        bool includeGlobal = true,
        CancellationToken cancellationToken = default);
}
