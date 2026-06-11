using Microsoft.EntityFrameworkCore;
using MyToggleService.ApiService.Data;
using MyToggleService.ApiService.Models;

namespace MyToggleService.ApiService.Services;

public sealed class ToggleService(ToggleDbContext db) : IToggleService
{
    public async Task<ServiceResult> ListAsync(Guid? applicationId, Guid? tenantId, bool includeGlobal, CancellationToken cancellationToken)
    {
        includeGlobal = includeGlobal || tenantId is null;

        var query = db.FeatureToggles
            .AsNoTracking()
            .Include(x => x.Application)
            .AsQueryable();

        if (applicationId is not null)
        {
            query = query.Where(x => x.ApplicationId == applicationId);
        }

        if (tenantId is not null)
        {
            query = includeGlobal
                ? query.Where(x => x.TenantId == tenantId || x.TenantId == null)
                : query.Where(x => x.TenantId == tenantId);
        }

        var result = await query
            .OrderBy(x => x.Application!.Name)
            .ThenBy(x => x.Key)
            .ThenBy(x => x.TenantId)
            .Select(x => new ToggleDto(
                x.Id,
                x.Key,
                x.ApplicationId,
                x.Application!.Name,
                x.TenantId,
                x.IsEnabled,
                x.CreatedAt,
                x.UpdatedAt))
            .ToListAsync(cancellationToken);

        return ServiceResult.Ok(result);
    }

    public async Task<ServiceResult> CreateAsync(CreateToggleRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Key))
        {
            return ServiceResult.BadRequest("Key is required.");
        }

        var key = request.Key.Trim();

        var application = await db.Applications
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.ApplicationId, cancellationToken);

        if (application is null)
        {
            return ServiceResult.BadRequest("ApplicationId does not exist.");
        }

        var tenantIds = request.TenantIds
            ?.Distinct()
            .ToList() ?? [];

        if (tenantIds.Count != 0)
        {
            var missingTenantIds = await FindMissingTenantIdsAsync(tenantIds, cancellationToken);
            if (missingTenantIds.Count != 0)
            {
                return ServiceResult.BadRequest(new { message = "Some tenantIds do not exist.", tenantIds = missingTenantIds });
            }
        }

        if (tenantIds.Count == 0)
        {
            var existsGlobal = await db.FeatureToggles.AnyAsync(
                x => x.ApplicationId == request.ApplicationId && x.Key == key && x.TenantId == null,
                cancellationToken);

            if (existsGlobal)
            {
                return ServiceResult.Conflict("A global toggle already exists for applicationId + key.");
            }

            var globalToggle = new FeatureToggleEntity
            {
                ApplicationId = request.ApplicationId,
                Key = key,
                TenantId = null,
                IsEnabled = request.IsEnabled,
            };

            db.FeatureToggles.Add(globalToggle);
            await db.SaveChangesAsync(cancellationToken);

            var created = new ToggleDto(
                globalToggle.Id,
                globalToggle.Key,
                globalToggle.ApplicationId,
                application.Name,
                globalToggle.TenantId,
                globalToggle.IsEnabled,
                globalToggle.CreatedAt,
                globalToggle.UpdatedAt);

            return ServiceResult.Created($"/api/toggles/{globalToggle.Id}", created);
        }

        var existing = await db.FeatureToggles
            .Where(x => x.ApplicationId == request.ApplicationId && x.Key == key && x.TenantId != null && tenantIds.Contains(x.TenantId.Value))
            .Select(x => x.TenantId)
            .ToListAsync(cancellationToken);

        if (existing.Count != 0)
        {
            return ServiceResult.Conflict(new { message = "Some tenantIds already have a toggle for this applicationId + key.", tenantIds = existing });
        }

        var createdToggles = tenantIds.Select(tenantId => new FeatureToggleEntity
        {
            ApplicationId = request.ApplicationId,
            Key = key,
            TenantId = tenantId,
            IsEnabled = request.IsEnabled,
        }).ToList();

        db.FeatureToggles.AddRange(createdToggles);
        await db.SaveChangesAsync(cancellationToken);

        var response = createdToggles.Select(x => new ToggleDto(
            x.Id,
            x.Key,
            x.ApplicationId,
            application.Name,
            x.TenantId,
            x.IsEnabled,
            x.CreatedAt,
            x.UpdatedAt));

        return ServiceResult.Created("/api/toggles", response);
    }

    public async Task<ServiceResult> UpdateAsync(Guid id, UpdateToggleRequest request, CancellationToken cancellationToken)
    {
        var entity = await db.FeatureToggles.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null)
        {
            return ServiceResult.NotFound();
        }

        var applicationExists = await db.Applications.AnyAsync(x => x.Id == request.ApplicationId, cancellationToken);
        if (!applicationExists)
        {
            return ServiceResult.BadRequest("ApplicationId does not exist.");
        }

        var key = request.Key?.Trim();
        if (string.IsNullOrWhiteSpace(key))
        {
            return ServiceResult.BadRequest("Key is required.");
        }

        if (request.TenantId is not null)
        {
            var tenantExists = await db.Tenants.AnyAsync(x => x.Id == request.TenantId, cancellationToken);
            if (!tenantExists)
            {
                return ServiceResult.BadRequest("TenantId does not exist.");
            }
        }

        var wouldConflict = await db.FeatureToggles.AnyAsync(
            x => x.Id != id &&
                 x.ApplicationId == request.ApplicationId &&
                 x.Key == key &&
                 x.TenantId == request.TenantId,
            cancellationToken);

        if (wouldConflict)
        {
            return ServiceResult.Conflict("A toggle already exists for this applicationId + key + tenantId.");
        }

        entity.Key = key;
        entity.ApplicationId = request.ApplicationId;
        entity.TenantId = request.TenantId;
        entity.IsEnabled = request.IsEnabled;
        await db.SaveChangesAsync(cancellationToken);

        var updated = await db.FeatureToggles
            .AsNoTracking()
            .Include(x => x.Application)
            .FirstAsync(x => x.Id == entity.Id, cancellationToken);

        return ServiceResult.Ok(new ToggleDto(
            updated.Id,
            updated.Key,
            updated.ApplicationId,
            updated.Application!.Name,
            updated.TenantId,
            updated.IsEnabled,
            updated.CreatedAt,
            updated.UpdatedAt));
    }

    public async Task<ServiceResult> UpdateGroupAsync(UpdateToggleGroupRequest request, CancellationToken cancellationToken)
    {
        var key = request.Key?.Trim();
        if (string.IsNullOrWhiteSpace(key))
        {
            return ServiceResult.BadRequest("Key is required.");
        }

        var application = await db.Applications
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.ApplicationId, cancellationToken);

        if (application is null)
        {
            return ServiceResult.BadRequest("ApplicationId does not exist.");
        }

        var tenantIds = request.TenantIds
            ?.Distinct()
            .ToList() ?? [];

        if (tenantIds.Count != 0)
        {
            var missingTenantIds = await FindMissingTenantIdsAsync(tenantIds, cancellationToken);
            if (missingTenantIds.Count != 0)
            {
                return ServiceResult.BadRequest(new { message = "Some tenantIds do not exist.", tenantIds = missingTenantIds });
            }
        }

        var existingGroup = await db.FeatureToggles
            .Where(x => x.ApplicationId == request.ApplicationId && x.Key == key)
            .ToListAsync(cancellationToken);

        if (existingGroup.Count == 0)
        {
            return ServiceResult.NotFound();
        }

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

        db.FeatureToggles.RemoveRange(existingGroup);
        await db.SaveChangesAsync(cancellationToken);

        List<FeatureToggleEntity> replacement;
        if (tenantIds.Count == 0)
        {
            replacement =
            [
                new FeatureToggleEntity
                {
                    ApplicationId = request.ApplicationId,
                    Key = key,
                    TenantId = null,
                    IsEnabled = request.IsEnabled,
                }
            ];
        }
        else
        {
            replacement = tenantIds.Select(tenantId => new FeatureToggleEntity
            {
                ApplicationId = request.ApplicationId,
                Key = key,
                TenantId = tenantId,
                IsEnabled = request.IsEnabled,
            }).ToList();
        }

        db.FeatureToggles.AddRange(replacement);
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        var response = replacement
            .OrderBy(x => x.TenantId)
            .Select(x => new ToggleDto(
                x.Id,
                x.Key,
                x.ApplicationId,
                application.Name,
                x.TenantId,
                x.IsEnabled,
                x.CreatedAt,
                x.UpdatedAt));

        return ServiceResult.Ok(response);
    }

    public async Task<ServiceResult> SetEnabledAsync(Guid id, SetToggleEnabledRequest request, CancellationToken cancellationToken)
    {
        var entity = await db.FeatureToggles.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null)
        {
            return ServiceResult.NotFound();
        }

        entity.IsEnabled = request.IsEnabled;
        await db.SaveChangesAsync(cancellationToken);

        return ServiceResult.Ok(entity);
    }

    public async Task<ServiceResult> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await db.FeatureToggles.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null)
        {
            return ServiceResult.NotFound();
        }

        db.FeatureToggles.Remove(entity);
        await db.SaveChangesAsync(cancellationToken);

        return ServiceResult.NoContent();
    }

    private async Task<List<Guid>> FindMissingTenantIdsAsync(
        IReadOnlyCollection<Guid> tenantIds,
        CancellationToken cancellationToken)
    {
        if (tenantIds.Count == 0)
        {
            return [];
        }

        var existingTenantIds = await db.Tenants
            .AsNoTracking()
            .Where(x => tenantIds.Contains(x.Id))
            .Select(x => x.Id)
            .ToListAsync(cancellationToken);

        return tenantIds
            .Except(existingTenantIds)
            .OrderBy(x => x)
            .ToList();
    }
}
