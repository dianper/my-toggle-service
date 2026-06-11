using Microsoft.EntityFrameworkCore;
using MyToggleService.ApiService.Models;

namespace MyToggleService.ApiService.Data;

public sealed class ToggleDbContext(DbContextOptions<ToggleDbContext> options) : DbContext(options)
{
    public DbSet<FeatureToggleEntity> FeatureToggles => Set<FeatureToggleEntity>();
    public DbSet<ApplicationEntity> Applications => Set<ApplicationEntity>();
    public DbSet<TenantEntity> Tenants => Set<TenantEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var applications = modelBuilder.Entity<ApplicationEntity>();

        applications.ToTable("applications");
        applications.HasKey(x => x.Id);

        applications.Property(x => x.Id).HasColumnName("id");
        applications.Property(x => x.Name).HasColumnName("name").HasMaxLength(200).IsRequired();
        applications.Property(x => x.Description).HasColumnName("description").HasMaxLength(1000);
        applications.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();
        applications.Property(x => x.UpdatedAt).HasColumnName("updated_at").IsRequired();

        applications
            .HasIndex(x => x.Name)
            .HasDatabaseName("ux_applications_name")
            .IsUnique();

        var tenants = modelBuilder.Entity<TenantEntity>();

        tenants.ToTable("tenants");
        tenants.HasKey(x => x.Id);

        tenants.Property(x => x.Id).HasColumnName("id");
        tenants.Property(x => x.Name).HasColumnName("name").HasMaxLength(200).IsRequired();
        tenants.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();
        tenants.Property(x => x.UpdatedAt).HasColumnName("updated_at").IsRequired();

        tenants
            .HasIndex(x => x.Name)
            .HasDatabaseName("ux_tenants_name")
            .IsUnique();

        var toggles = modelBuilder.Entity<FeatureToggleEntity>();

        toggles.ToTable("feature_toggles");
        toggles.HasKey(x => x.Id);

        toggles.Property(x => x.Id).HasColumnName("id");
        toggles.Property(x => x.Key).HasColumnName("key").HasMaxLength(200).IsRequired();
        toggles.Property(x => x.ApplicationId).HasColumnName("application_id").IsRequired();
        toggles.Property(x => x.TenantId).HasColumnName("tenant_id");
        toggles.Property(x => x.IsEnabled).HasColumnName("is_enabled").IsRequired();
        toggles.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();
        toggles.Property(x => x.UpdatedAt).HasColumnName("updated_at").IsRequired();

        toggles
            .HasOne(x => x.Application)
            .WithMany(x => x.FeatureToggles)
            .HasForeignKey(x => x.ApplicationId)
            .OnDelete(DeleteBehavior.Restrict);

        toggles
            .HasIndex(x => new { x.ApplicationId, x.Key })
            .HasDatabaseName("ux_feature_toggles_global")
            .IsUnique()
            .HasFilter("tenant_id IS NULL");

        toggles
            .HasIndex(x => new { x.ApplicationId, x.Key, x.TenantId })
            .HasDatabaseName("ux_feature_toggles_tenant")
            .IsUnique()
            .HasFilter("tenant_id IS NOT NULL");

        toggles.HasIndex(x => x.TenantId).HasDatabaseName("ix_feature_toggles_tenant");
        toggles.HasIndex(x => new { x.ApplicationId, x.Key }).HasDatabaseName("ix_feature_toggles_app_key");
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var toggleEntries = ChangeTracker
            .Entries<FeatureToggleEntity>()
            .Where(e => e.State is EntityState.Added or EntityState.Modified);

        foreach (var entry in toggleEntries)
        {
            entry.Entity.UpdatedAt = DateTimeOffset.UtcNow;
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAt = DateTimeOffset.UtcNow;
            }
        }

        var applicationEntries = ChangeTracker
            .Entries<ApplicationEntity>()
            .Where(e => e.State is EntityState.Added or EntityState.Modified);

        foreach (var entry in applicationEntries)
        {
            entry.Entity.UpdatedAt = DateTimeOffset.UtcNow;
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAt = DateTimeOffset.UtcNow;
            }
        }

        var tenantEntries = ChangeTracker
            .Entries<TenantEntity>()
            .Where(e => e.State is EntityState.Added or EntityState.Modified);

        foreach (var entry in tenantEntries)
        {
            entry.Entity.UpdatedAt = DateTimeOffset.UtcNow;
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAt = DateTimeOffset.UtcNow;
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
