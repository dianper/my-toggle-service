namespace MyToggleService.ApiService.Models;

public sealed record CreateToggleRequest(
    string Key,
    string Application,
    bool IsEnabled,
    List<Guid>? TenantIds);

public sealed record UpdateToggleRequest(
    string Key,
    string Application,
    Guid? TenantId,
    bool IsEnabled);

public sealed record SetToggleEnabledRequest(bool IsEnabled);

public sealed record EvaluateToggleBatchRequest(
    string Application,
    Guid? TenantId,
    List<string> Keys);

public sealed record EvaluateToggleResponse(
    string Key,
    string Application,
    Guid? TenantId,
    bool IsEnabled,
    string Resolution);
