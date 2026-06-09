using Microsoft.EntityFrameworkCore;
using MyToggleService.ApiService.Models;

namespace MyToggleService.ApiService.Data;

public sealed class ToggleDbContext(DbContextOptions<ToggleDbContext> options) : DbContext(options)
{
    public DbSet<FeatureToggleEntity> FeatureToggles => Set<FeatureToggleEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var toggles = modelBuilder.Entity<FeatureToggleEntity>();

        toggles.ToTable("feature_toggles");
        toggles.HasKey(x => x.Id);

        toggles.Property(x => x.Id).HasColumnName("id");
        toggles.Property(x => x.Key).HasColumnName("key").HasMaxLength(200).IsRequired();
        toggles.Property(x => x.Application).HasColumnName("application").HasMaxLength(200).IsRequired();
        toggles.Property(x => x.TenantId).HasColumnName("tenant_id");
        toggles.Property(x => x.IsEnabled).HasColumnName("is_enabled").IsRequired();
        toggles.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();
        toggles.Property(x => x.UpdatedAt).HasColumnName("updated_at").IsRequired();

        toggles
            .HasIndex(x => new { x.Application, x.Key })
            .HasDatabaseName("ux_feature_toggles_global")
            .IsUnique()
            .HasFilter("tenant_id IS NULL");

        toggles
            .HasIndex(x => new { x.Application, x.Key, x.TenantId })
            .HasDatabaseName("ux_feature_toggles_tenant")
            .IsUnique()
            .HasFilter("tenant_id IS NOT NULL");

        toggles.HasIndex(x => x.TenantId).HasDatabaseName("ix_feature_toggles_tenant");
        toggles.HasIndex(x => new { x.Application, x.Key }).HasDatabaseName("ix_feature_toggles_app_key");
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var entries = ChangeTracker
            .Entries<FeatureToggleEntity>()
            .Where(e => e.State is EntityState.Added or EntityState.Modified);

        foreach (var entry in entries)
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
