using MyToggleService.Client.Models;

namespace MyToggleService.Client;

public interface IMyToggleServiceClient
{
    Task<EvaluateToggleResponse> EvaluateAsync(
        string key,
        Guid? tenantId = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<EvaluateToggleResponse>> EvaluateBatchAsync(
        IEnumerable<string> keys,
        Guid? tenantId = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ToggleDto>> ListTogglesAsync(
        Guid? tenantId = null,
        bool includeGlobal = true,
        CancellationToken cancellationToken = default);
}
