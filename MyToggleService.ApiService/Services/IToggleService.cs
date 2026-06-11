using MyToggleService.ApiService.Models;

namespace MyToggleService.ApiService.Services;

public interface IToggleService
{
    Task<ServiceResult> ListAsync(Guid? applicationId, Guid? tenantId, bool includeGlobal, CancellationToken cancellationToken);
    Task<ServiceResult> CreateAsync(CreateToggleRequest request, CancellationToken cancellationToken);
    Task<ServiceResult> UpdateAsync(Guid id, UpdateToggleRequest request, CancellationToken cancellationToken);
    Task<ServiceResult> UpdateGroupAsync(UpdateToggleGroupRequest request, CancellationToken cancellationToken);
    Task<ServiceResult> SetEnabledAsync(Guid id, SetToggleEnabledRequest request, CancellationToken cancellationToken);
    Task<ServiceResult> DeleteAsync(Guid id, CancellationToken cancellationToken);
}
