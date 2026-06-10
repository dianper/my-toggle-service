using System.Text;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MyToggleService.ApiService.Data;
using MyToggleService.ApiService.Models;
using MyToggleService.ApiService.Services;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();

var connectionString = builder.Configuration.GetConnectionString("togglesdb")
    ?? "Host=localhost;Port=5432;Database=togglesdb;Username=postgres;Password=postgres";

builder.Services.AddDbContext<ToggleDbContext>(options => options.UseNpgsql(connectionString));
builder.Services.AddHealthChecks().AddDbContextCheck<ToggleDbContext>();

// Add session support for OAuth state validation
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(30);
    options.Cookie.HttpOnly = true;
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    options.Cookie.SameSite = SameSiteMode.Strict;
});

// Add authentication services
builder.Services.AddScoped<IAuthenticationService, AuthenticationService>();
builder.Services.AddHttpClient();

// Add controllers
builder.Services.AddControllers();

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(builder =>
    {
        builder
            .WithOrigins("http://localhost:5173", "https://localhost:5173")
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
    });
});

var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "my-toggle-service";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "my-toggle-service-internal";
var jwtKey = builder.Configuration["Jwt:Key"] ?? "dev-only-key-change-this-in-prod-123456789";

// Add authentication for cookie and JWT bearer
builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = CookieAuthenticationDefaults.AuthenticationScheme;
    })
    .AddCookie(CookieAuthenticationDefaults.AuthenticationScheme, options =>
    {
        options.LoginPath = "/login";
        options.LogoutPath = "/auth/logout";
        options.ExpireTimeSpan = TimeSpan.FromHours(8);
        options.Cookie.HttpOnly = true;
        options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        options.Cookie.SameSite = SameSiteMode.Strict;
        options.Events.OnValidatePrincipal = context =>
        {
            // Extract JWT token from cookie and validate it
            if (context.Request.Cookies.TryGetValue("auth_token", out var token))
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                try
                {
                    var principal = tokenHandler.ValidateToken(token, new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidateAudience = true,
                        ValidateIssuerSigningKey = true,
                        ValidateLifetime = true,
                        ValidIssuer = jwtIssuer,
                        ValidAudience = jwtAudience,
                        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
                        ClockSkew = TimeSpan.FromSeconds(30)
                    }, out SecurityToken validatedToken);
                    context.Principal = principal;
                }
                catch
                {
                    context.RejectPrincipal();
                }
            }
            return Task.CompletedTask;
        };
    })
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
    await db.Database.MigrateAsync();
}

app.UseExceptionHandler();
app.UseSession();
app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapGet("/", () => Results.Ok(new { service = "my-toggle-service", status = "running" }));

// Map controllers (AuthController)
app.MapControllers();

var toggles = app.MapGroup("/api/toggles").RequireAuthorization();

toggles.MapGet("/", async (
    ToggleDbContext db,
    Guid? applicationId,
    Guid? tenantId,
    bool includeGlobal,
    CancellationToken cancellationToken) =>
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

    return Results.Ok(result);
});

toggles.MapPost("/", async (ToggleDbContext db, CreateToggleRequest request, CancellationToken cancellationToken) =>
{
    if (string.IsNullOrWhiteSpace(request.Key))
    {
        return Results.BadRequest("Key is required.");
    }

    var application = await db.Applications
        .AsNoTracking()
        .FirstOrDefaultAsync(x => x.Id == request.ApplicationId, cancellationToken);

    if (application is null)
    {
        return Results.BadRequest("ApplicationId does not exist.");
    }

    if (request.TenantIds is null || request.TenantIds.Count == 0)
    {
        var existsGlobal = await db.FeatureToggles.AnyAsync(
            x => x.ApplicationId == request.ApplicationId && x.Key == request.Key && x.TenantId == null,
            cancellationToken);

        if (existsGlobal)
        {
            return Results.Conflict("A global toggle already exists for applicationId + key.");
        }

        var globalToggle = new FeatureToggleEntity
        {
            ApplicationId = request.ApplicationId,
            Key = request.Key,
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

        return Results.Created($"/api/toggles/{globalToggle.Id}", created);
    }

    var tenantIds = request.TenantIds.Distinct().ToList();
    var existing = await db.FeatureToggles
        .Where(x => x.ApplicationId == request.ApplicationId && x.Key == request.Key && x.TenantId != null && tenantIds.Contains(x.TenantId.Value))
        .Select(x => x.TenantId)
        .ToListAsync(cancellationToken);

    if (existing.Count != 0)
    {
        return Results.Conflict(new { message = "Some tenantIds already have a toggle for this applicationId + key.", tenantIds = existing });
    }

    var createdToggles = tenantIds.Select(tenantId => new FeatureToggleEntity
    {
        ApplicationId = request.ApplicationId,
        Key = request.Key,
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

    return Results.Created("/api/toggles", response);
});

toggles.MapPut("/{id:guid}", async (ToggleDbContext db, Guid id, UpdateToggleRequest request, CancellationToken cancellationToken) =>
{
    var entity = await db.FeatureToggles.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    if (entity is null)
    {
        return Results.NotFound();
    }

    var applicationExists = await db.Applications.AnyAsync(x => x.Id == request.ApplicationId, cancellationToken);
    if (!applicationExists)
    {
        return Results.BadRequest("ApplicationId does not exist.");
    }

    entity.Key = request.Key;
    entity.ApplicationId = request.ApplicationId;
    entity.TenantId = request.TenantId;
    entity.IsEnabled = request.IsEnabled;
    await db.SaveChangesAsync(cancellationToken);

    var updated = await db.FeatureToggles
        .AsNoTracking()
        .Include(x => x.Application)
        .FirstAsync(x => x.Id == entity.Id, cancellationToken);

    return Results.Ok(new ToggleDto(
        updated.Id,
        updated.Key,
        updated.ApplicationId,
        updated.Application!.Name,
        updated.TenantId,
        updated.IsEnabled,
        updated.CreatedAt,
        updated.UpdatedAt));
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
    Guid applicationId,
    string key,
    Guid? tenantId,
    CancellationToken cancellationToken) =>
{
    var response = await EvaluateToggleAsync(db, applicationId, key, tenantId, cancellationToken);
    return Results.Ok(response);
});

evaluate.MapPost("/batch", async (ToggleDbContext db, EvaluateToggleBatchRequest request, CancellationToken cancellationToken) =>
{
    var keys = request.Keys.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
    var responses = new List<EvaluateToggleResponse>(keys.Count);

    foreach (var key in keys)
    {
        responses.Add(await EvaluateToggleAsync(db, request.ApplicationId, key, request.TenantId, cancellationToken));
    }

    return Results.Ok(new
    {
        request.ApplicationId,
        request.TenantId,
        timestamp = DateTimeOffset.UtcNow,
        toggles = responses
    });
});

var applications = app.MapGroup("/api/applications").RequireAuthorization();

applications.MapGet("/", async (ToggleDbContext db, CancellationToken cancellationToken) =>
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

    return Results.Ok(result);
});

applications.MapPost("/", async (ToggleDbContext db, CreateApplicationRequest request, CancellationToken cancellationToken) =>
{
    if (string.IsNullOrWhiteSpace(request.Name))
    {
        return Results.BadRequest("Name is required.");
    }

    var name = request.Name.Trim();

    var exists = await db.Applications.AnyAsync(x => x.Name == name, cancellationToken);
    if (exists)
    {
        return Results.Conflict("An application with this name already exists.");
    }

    var application = new ApplicationEntity
    {
        Name = name,
        Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
    };

    db.Applications.Add(application);
    await db.SaveChangesAsync(cancellationToken);

    return Results.Created($"/api/applications/{application.Id}", new ApplicationDto(
        application.Id,
        application.Name,
        application.Description,
        application.CreatedAt,
        application.UpdatedAt));
});

applications.MapDelete("/{id:guid}", async (ToggleDbContext db, Guid id, CancellationToken cancellationToken) =>
{
    var application = await db.Applications.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    if (application is null)
    {
        return Results.NotFound();
    }

    var hasToggles = await db.FeatureToggles.AnyAsync(x => x.ApplicationId == id, cancellationToken);
    if (hasToggles)
    {
        return Results.Conflict("Cannot delete an application with existing toggles.");
    }

    db.Applications.Remove(application);
    await db.SaveChangesAsync(cancellationToken);

    return Results.NoContent();
});

app.MapDefaultEndpoints();

// Use CORS
app.UseCors();

app.Run();

static async Task<EvaluateToggleResponse> EvaluateToggleAsync(
    ToggleDbContext db,
    Guid applicationId,
    string key,
    Guid? tenantId,
    CancellationToken cancellationToken)
{
    var query = db.FeatureToggles
        .AsNoTracking()
        .Where(x => x.ApplicationId == applicationId && x.Key == key);

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
        return new EvaluateToggleResponse(key, applicationId, tenantId, false, "default-disabled");
    }

    var resolution = resolved.TenantId == tenantId ? "tenant-specific" : "global";
    return new EvaluateToggleResponse(key, applicationId, resolved.TenantId, resolved.IsEnabled, resolution);
}
