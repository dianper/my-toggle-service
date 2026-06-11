using MyToggleService.ApiService.Models;

namespace MyToggleService.ApiService.Services;

public interface ITenantService
{
    Task<ServiceResult> ListAsync(CancellationToken cancellationToken);
    Task<ServiceResult> CreateAsync(CreateTenantRequest request, CancellationToken cancellationToken);
    Task<ServiceResult> UpdateAsync(Guid id, UpdateTenantRequest request, CancellationToken cancellationToken);
    Task<ServiceResult> DeleteAsync(Guid id, CancellationToken cancellationToken);
}
