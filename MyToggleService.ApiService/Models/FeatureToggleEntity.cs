namespace MyToggleService.ApiService.Models;

public sealed class FeatureToggleEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Key { get; set; } = string.Empty;
    public Guid ApplicationId { get; set; }
    public ApplicationEntity? Application { get; set; }
    public Guid? TenantId { get; set; }
    public bool IsEnabled { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
