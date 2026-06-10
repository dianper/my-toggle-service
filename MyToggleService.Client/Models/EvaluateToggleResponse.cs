namespace MyToggleService.Client.Models;

public sealed record EvaluateToggleResponse(
    string Key,
    Guid ApplicationId,
    Guid? TenantId,
    bool IsEnabled,
    string Resolution);
