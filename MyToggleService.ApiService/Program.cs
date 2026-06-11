using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MyToggleService.ApiService.Data;
using MyToggleService.ApiService.Services;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();

var connectionString = builder.Configuration.GetConnectionString("togglesdb")
    ?? "Host=localhost;Port=5432;Database=togglesdb;Username=postgres;Password=postgres";

builder.Services.AddDbContext<ToggleDbContext>(options => options.UseNpgsql(connectionString));
builder.Services.AddHealthChecks().AddDbContextCheck<ToggleDbContext>();

// Session middleware requires an IDistributedCache implementation.
builder.Services.AddDistributedMemoryCache();

// Add session support for OAuth state validation
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(30);
    options.Cookie.HttpOnly = true;
    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
        ? CookieSecurePolicy.SameAsRequest
        : CookieSecurePolicy.Always;
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.IsEssential = true;
});

// Add domain services
builder.Services.AddScoped<IAuthenticationService, AuthenticationService>();
builder.Services.AddScoped<IToggleService, ToggleService>();
builder.Services.AddScoped<IEvaluationService, EvaluationService>();
builder.Services.AddScoped<IApplicationService, ApplicationService>();
builder.Services.AddScoped<ITenantService, TenantService>();
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

// Add authentication using JWT read from auth_token cookie.
builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
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

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                if (context.Request.Cookies.TryGetValue("auth_token", out var token))
                {
                    context.Token = token;
                }

                return Task.CompletedTask;
            }
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
app.MapControllers();

app.MapDefaultEndpoints();

// Use CORS
app.UseCors();

app.Run();
