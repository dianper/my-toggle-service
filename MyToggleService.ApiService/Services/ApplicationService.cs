using Microsoft.EntityFrameworkCore;
using MyToggleService.ApiService.Data;
using MyToggleService.ApiService.Models;

namespace MyToggleService.ApiService.Services;

public sealed class ApplicationService(ToggleDbContext db) : IApplicationService
{
    public async Task<ServiceResult> ListAsync(CancellationToken cancellationToken)
    {
        var result = await db.Applications
            .AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new ApplicationDto(
                x.Id,
                x.Name,
                x.Description,
                x.CreatedAt,
                x.UpdatedAt))
            .ToListAsync(cancellationToken);

        return ServiceResult.Ok(result);
    }

    public async Task<ServiceResult> CreateAsync(CreateApplicationRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return ServiceResult.BadRequest("Name is required.");
        }

        var name = request.Name.Trim();

        var exists = await db.Applications.AnyAsync(x => x.Name == name, cancellationToken);
        if (exists)
        {
            return ServiceResult.Conflict("An application with this name already exists.");
        }

        var application = new ApplicationEntity
        {
            Name = name,
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
        };

        db.Applications.Add(application);
        await db.SaveChangesAsync(cancellationToken);

        return ServiceResult.Created($"/api/applications/{application.Id}", new ApplicationDto(
            application.Id,
            application.Name,
            application.Description,
            application.CreatedAt,
            application.UpdatedAt));
    }

    public async Task<ServiceResult> UpdateAsync(Guid id, UpdateApplicationRequest request, CancellationToken cancellationToken)
    {
        var application = await db.Applications.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (application is null)
        {
            return ServiceResult.NotFound();
        }

        var name = request.Name?.Trim();
        if (string.IsNullOrWhiteSpace(name))
        {
            return ServiceResult.BadRequest("Name is required.");
        }

        var exists = await db.Applications.AnyAsync(x => x.Name == name && x.Id != id, cancellationToken);
        if (exists)
        {
            return ServiceResult.Conflict("An application with this name already exists.");
        }

        application.Name = name;
        application.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        await db.SaveChangesAsync(cancellationToken);

        return ServiceResult.Ok(new ApplicationDto(
            application.Id,
            application.Name,
            application.Description,
            application.CreatedAt,
            application.UpdatedAt));
    }

    public async Task<ServiceResult> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var application = await db.Applications.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (application is null)
        {
            return ServiceResult.NotFound();
        }

        var hasToggles = await db.FeatureToggles.AnyAsync(x => x.ApplicationId == id, cancellationToken);
        if (hasToggles)
        {
            return ServiceResult.Conflict("Cannot delete an application with existing toggles.");
        }

        db.Applications.Remove(application);
        await db.SaveChangesAsync(cancellationToken);

        return ServiceResult.NoContent();
    }
}
