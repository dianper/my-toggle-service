using MyToggleService.ApiService.Models;

namespace MyToggleService.ApiService.Services;

public interface IApplicationService
{
    Task<ServiceResult> ListAsync(CancellationToken cancellationToken);
    Task<ServiceResult> CreateAsync(CreateApplicationRequest request, CancellationToken cancellationToken);
    Task<ServiceResult> UpdateAsync(Guid id, UpdateApplicationRequest request, CancellationToken cancellationToken);
    Task<ServiceResult> DeleteAsync(Guid id, CancellationToken cancellationToken);
}
