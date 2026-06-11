using Microsoft.EntityFrameworkCore;
using MyToggleService.ApiService.Data;
using MyToggleService.ApiService.Models;

namespace MyToggleService.ApiService.Services;

public sealed class TenantService(ToggleDbContext db) : ITenantService
{
    public async Task<ServiceResult> ListAsync(CancellationToken cancellationToken)
    {
        var result = await db.Tenants
            .AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new TenantDto(
                x.Id,
                x.Name,
                x.CreatedAt,
                x.UpdatedAt))
            .ToListAsync(cancellationToken);

        return ServiceResult.Ok(result);
    }

    public async Task<ServiceResult> CreateAsync(CreateTenantRequest request, CancellationToken cancellationToken)
    {
        if (request.Id == Guid.Empty)
        {
            return ServiceResult.BadRequest("Id is required.");
        }

        var name = request.Name?.Trim();
        if (string.IsNullOrWhiteSpace(name))
        {
            return ServiceResult.BadRequest("Name is required.");
        }

        var idExists = await db.Tenants.AnyAsync(x => x.Id == request.Id, cancellationToken);
        if (idExists)
        {
            return ServiceResult.Conflict("A tenant with this ID already exists.");
        }

        var exists = await db.Tenants.AnyAsync(x => x.Name == name, cancellationToken);
        if (exists)
        {
            return ServiceResult.Conflict("A tenant with this name already exists.");
        }

        var tenant = new TenantEntity
        {
            Id = request.Id,
            Name = name,
        };

        db.Tenants.Add(tenant);
        await db.SaveChangesAsync(cancellationToken);

        return ServiceResult.Created($"/api/tenants/{tenant.Id}", new TenantDto(
            tenant.Id,
            tenant.Name,
            tenant.CreatedAt,
            tenant.UpdatedAt));
    }

    public async Task<ServiceResult> UpdateAsync(Guid id, UpdateTenantRequest request, CancellationToken cancellationToken)
    {
        var tenant = await db.Tenants.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (tenant is null)
        {
            return ServiceResult.NotFound();
        }

        var name = request.Name?.Trim();
        if (string.IsNullOrWhiteSpace(name))
        {
            return ServiceResult.BadRequest("Name is required.");
        }

        var exists = await db.Tenants.AnyAsync(x => x.Name == name && x.Id != id, cancellationToken);
        if (exists)
        {
            return ServiceResult.Conflict("A tenant with this name already exists.");
        }

        tenant.Name = name;
        await db.SaveChangesAsync(cancellationToken);

        return ServiceResult.Ok(new TenantDto(
            tenant.Id,
            tenant.Name,
            tenant.CreatedAt,
            tenant.UpdatedAt));
    }

    public async Task<ServiceResult> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var tenant = await db.Tenants.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (tenant is null)
        {
            return ServiceResult.NotFound();
        }

        var isInUse = await db.FeatureToggles.AnyAsync(x => x.TenantId == id, cancellationToken);
        if (isInUse)
        {
            return ServiceResult.Conflict("Cannot delete a tenant with existing toggles.");
        }

        db.Tenants.Remove(tenant);
        await db.SaveChangesAsync(cancellationToken);

        return ServiceResult.NoContent();
    }
}
