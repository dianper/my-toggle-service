using System.Text;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MyToggleService.ApiService.Data;
using MyToggleService.ApiService.Models;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();

var connectionString = builder.Configuration.GetConnectionString("togglesdb")
    ?? "Host=localhost;Port=5432;Database=togglesdb;Username=postgres;Password=postgres";

builder.Services.AddDbContext<ToggleDbContext>(options => options.UseNpgsql(connectionString));
builder.Services.AddHealthChecks().AddDbContextCheck<ToggleDbContext>();

var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "my-toggle-service";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "my-toggle-service-internal";
var jwtKey = builder.Configuration["Jwt:Key"] ?? "dev-only-key-change-this-in-prod-123456789";

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.FromSeconds(30)
        };
    });
builder.Services.AddAuthorization();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ToggleDbContext>();
    await db.Database.EnsureCreatedAsync();
}

app.UseExceptionHandler();
app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapGet("/", () => Results.Ok(new { service = "my-toggle-service", status = "running" }));

app.MapPost("/api/auth/dev-token", (string? subject) =>
{
    if (!app.Environment.IsDevelopment())
    {
        return Results.NotFound();
    }

    var claims = new List<Claim>
    {
        new(JwtRegisteredClaimNames.Sub, subject ?? "internal-admin"),
        new(ClaimTypes.Role, "admin")
    };

    var credentials = new SigningCredentials(
        new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        SecurityAlgorithms.HmacSha256);

    var token = new JwtSecurityToken(
        issuer: jwtIssuer,
        audience: jwtAudience,
        claims: claims,
        expires: DateTime.UtcNow.AddHours(8),
        signingCredentials: credentials);

    return Results.Ok(new
    {
        token = new JwtSecurityTokenHandler().WriteToken(token),
        tokenType = "Bearer",
        expiresInSeconds = 28800
    });
});

var toggles = app.MapGroup("/api/toggles").RequireAuthorization();

toggles.MapGet("/", async (
    ToggleDbContext db,
    string? application,
    Guid? tenantId,
    bool includeGlobal,
    CancellationToken cancellationToken) =>
{
    includeGlobal = includeGlobal || tenantId is null;

    var query = db.FeatureToggles.AsNoTracking().AsQueryable();

    if (!string.IsNullOrWhiteSpace(application))
    {
        query = query.Where(x => x.Application == application);
    }

    if (tenantId is not null)
    {
        query = includeGlobal
            ? query.Where(x => x.TenantId == tenantId || x.TenantId == null)
            : query.Where(x => x.TenantId == tenantId);
    }

    var result = await query
        .OrderBy(x => x.Application)
        .ThenBy(x => x.Key)
        .ThenBy(x => x.TenantId)
        .ToListAsync(cancellationToken);

    return Results.Ok(result);
});

toggles.MapPost("/", async (ToggleDbContext db, CreateToggleRequest request, CancellationToken cancellationToken) =>
{
    if (string.IsNullOrWhiteSpace(request.Key) || string.IsNullOrWhiteSpace(request.Application))
    {
        return Results.BadRequest("Key and application are required.");
    }

    if (request.TenantIds is null || request.TenantIds.Count == 0)
    {
        var existsGlobal = await db.FeatureToggles.AnyAsync(
            x => x.Application == request.Application && x.Key == request.Key && x.TenantId == null,
            cancellationToken);

        if (existsGlobal)
        {
            return Results.Conflict("A global toggle already exists for application + key.");
        }

        var globalToggle = new FeatureToggleEntity
        {
            Application = request.Application,
            Key = request.Key,
            TenantId = null,
            IsEnabled = request.IsEnabled,
        };

        db.FeatureToggles.Add(globalToggle);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Created($"/api/toggles/{globalToggle.Id}", globalToggle);
    }

    var tenantIds = request.TenantIds.Distinct().ToList();
    var existing = await db.FeatureToggles
        .Where(x => x.Application == request.Application && x.Key == request.Key && x.TenantId != null && tenantIds.Contains(x.TenantId.Value))
        .Select(x => x.TenantId)
        .ToListAsync(cancellationToken);

    if (existing.Count != 0)
    {
        return Results.Conflict(new { message = "Some tenantIds already have a toggle for this application + key.", tenantIds = existing });
    }

    var created = tenantIds.Select(tenantId => new FeatureToggleEntity
    {
        Application = request.Application,
        Key = request.Key,
        TenantId = tenantId,
        IsEnabled = request.IsEnabled,
    }).ToList();

    db.FeatureToggles.AddRange(created);
    await db.SaveChangesAsync(cancellationToken);

    return Results.Created("/api/toggles", created);
});

toggles.MapPut("/{id:guid}", async (ToggleDbContext db, Guid id, UpdateToggleRequest request, CancellationToken cancellationToken) =>
{
    var entity = await db.FeatureToggles.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    if (entity is null)
    {
        return Results.NotFound();
    }

    entity.Key = request.Key;
    entity.Application = request.Application;
    entity.TenantId = request.TenantId;
    entity.IsEnabled = request.IsEnabled;
    await db.SaveChangesAsync(cancellationToken);

    return Results.Ok(entity);
});

toggles.MapPatch("/{id:guid}/enabled", async (ToggleDbContext db, Guid id, SetToggleEnabledRequest request, CancellationToken cancellationToken) =>
{
    var entity = await db.FeatureToggles.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    if (entity is null)
    {
        return Results.NotFound();
    }

    entity.IsEnabled = request.IsEnabled;
    await db.SaveChangesAsync(cancellationToken);

    return Results.Ok(entity);
});

toggles.MapDelete("/{id:guid}", async (ToggleDbContext db, Guid id, CancellationToken cancellationToken) =>
{
    var entity = await db.FeatureToggles.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    if (entity is null)
    {
        return Results.NotFound();
    }

    db.FeatureToggles.Remove(entity);
    await db.SaveChangesAsync(cancellationToken);

    return Results.NoContent();
});

var evaluate = app.MapGroup("/api/evaluate").RequireAuthorization();

evaluate.MapGet("/single", async (
    ToggleDbContext db,
    string application,
    string key,
    Guid? tenantId,
    CancellationToken cancellationToken) =>
{
    var response = await EvaluateToggleAsync(db, application, key, tenantId, cancellationToken);
    return Results.Ok(response);
});

evaluate.MapPost("/batch", async (ToggleDbContext db, EvaluateToggleBatchRequest request, CancellationToken cancellationToken) =>
{
    var keys = request.Keys.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
    var responses = new List<EvaluateToggleResponse>(keys.Count);

    foreach (var key in keys)
    {
        responses.Add(await EvaluateToggleAsync(db, request.Application, key, request.TenantId, cancellationToken));
    }

    return Results.Ok(new
    {
        request.Application,
        request.TenantId,
        timestamp = DateTimeOffset.UtcNow,
        toggles = responses
    });
});

app.MapDefaultEndpoints();
app.Run();

static async Task<EvaluateToggleResponse> EvaluateToggleAsync(
    ToggleDbContext db,
    string application,
    string key,
    Guid? tenantId,
    CancellationToken cancellationToken)
{
    var query = db.FeatureToggles
        .AsNoTracking()
        .Where(x => x.Application == application && x.Key == key);

    if (tenantId is not null)
    {
        query = query.Where(x => x.TenantId == tenantId || x.TenantId == null);
    }
    else
    {
        query = query.Where(x => x.TenantId == null);
    }

    var resolved = await query
        .OrderByDescending(x => x.TenantId == tenantId)
        .ThenByDescending(x => x.UpdatedAt)
        .FirstOrDefaultAsync(cancellationToken);

    if (resolved is null)
    {
        return new EvaluateToggleResponse(key, application, tenantId, false, "default-disabled");
    }

    var resolution = resolved.TenantId == tenantId ? "tenant-specific" : "global";
    return new EvaluateToggleResponse(key, application, resolved.TenantId, resolved.IsEnabled, resolution);
}
