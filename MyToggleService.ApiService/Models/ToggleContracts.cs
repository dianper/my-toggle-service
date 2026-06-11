namespace MyToggleService.ApiService.Models;

public sealed record CreateToggleRequest(
    string Key,
    Guid ApplicationId,
    bool IsEnabled,
    List<Guid>? TenantIds);

public sealed record UpdateToggleRequest(
    string Key,
    Guid ApplicationId,
    Guid? TenantId,
    bool IsEnabled);

public sealed record UpdateToggleGroupRequest(
    string Key,
    Guid ApplicationId,
    bool IsEnabled,
    List<Guid>? TenantIds);

public sealed record SetToggleEnabledRequest(bool IsEnabled);

public sealed record EvaluateToggleBatchRequest(
    Guid ApplicationId,
    Guid? TenantId,
    List<string> Keys);

public sealed record EvaluateToggleResponse(
    string Key,
    Guid ApplicationId,
    Guid? TenantId,
    bool IsEnabled,
    string Resolution);

public sealed record ToggleDto(
    Guid Id,
    string Key,
    Guid ApplicationId,
    string ApplicationName,
    Guid? TenantId,
    bool IsEnabled,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record CreateApplicationRequest(
    string Name,
    string? Description);

public sealed record UpdateApplicationRequest(
    string Name,
    string? Description);

public sealed record ApplicationDto(
    Guid Id,
    string Name,
    string? Description,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record CreateTenantRequest(Guid Id, string Name);

public sealed record UpdateTenantRequest(string Name);

public sealed record TenantDto(
    Guid Id,
    string Name,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);
