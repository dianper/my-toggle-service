namespace MyToggleService.Client.Models;

public sealed record ToggleDto(
    Guid Id,
    string Key,
    Guid ApplicationId,
    string ApplicationName,
    Guid? TenantId,
    bool IsEnabled,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);
