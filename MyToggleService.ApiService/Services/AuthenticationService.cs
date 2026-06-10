using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace MyToggleService.ApiService.Services;

public interface IAuthenticationService
{
    /// <summary>
    /// Generates a URL to initiate the OAuth2 Code Flow with Microsoft
    /// </summary>
    string GetAuthorizationUrl(string redirectUri, string state);

    /// <summary>
    /// Exchanges the authorization code for an access token and ID token from Microsoft
    /// </summary>
    Task<OpenIdConnectMessage> ExchangeCodeForTokenAsync(string code, string redirectUri);

    /// <summary>
    /// Validates the ID token from Microsoft and extracts user claims
    /// </summary>
    Task<ClaimsPrincipal?> ValidateAndGetClaimsAsync(string idToken);

    /// <summary>
    /// Generates an internal JWT token for the application
    /// </summary>
    string GenerateJwtToken(string email, string displayName);
}

public class AuthenticationService : IAuthenticationService
{
    private readonly IConfiguration _configuration;
    private readonly HttpClient _httpClient;
    private readonly ILogger<AuthenticationService> _logger;

    public AuthenticationService(
        IConfiguration configuration,
        HttpClient httpClient,
        ILogger<AuthenticationService> logger)
    {
        _configuration = configuration;
        _httpClient = httpClient;
        _logger = logger;
    }

    public string GetAuthorizationUrl(string redirectUri, string state)
    {
        var tenantId = _configuration["AzureAd:TenantId"];
        var clientId = _configuration["AzureAd:ClientId"];
        var authority = _configuration["AzureAd:Authority"]?.Replace("{TenantId}", tenantId);

        var authorizationEndpoint = $"{authority}/oauth2/v2.0/authorize";

        var queryParams = new Dictionary<string, string>
        {
            { "client_id", clientId! },
            { "redirect_uri", redirectUri },
            { "response_type", "code" },
            { "scope", "openid profile email" },
            { "state", state },
            { "response_mode", "query" }
        };

        var queryString = string.Join("&", queryParams.Select(p => $"{Uri.EscapeDataString(p.Key)}={Uri.EscapeDataString(p.Value)}"));
        return $"{authorizationEndpoint}?{queryString}";
    }

    public async Task<OpenIdConnectMessage> ExchangeCodeForTokenAsync(string code, string redirectUri)
    {
        var tenantId = _configuration["AzureAd:TenantId"];
        var clientId = _configuration["AzureAd:ClientId"];
        var clientSecret = _configuration["AzureAd:ClientSecret"];
        var authority = _configuration["AzureAd:Authority"]?.Replace("{TenantId}", tenantId);

        var tokenEndpoint = $"{authority}/oauth2/v2.0/token";

        var request = new HttpRequestMessage(HttpMethod.Post, tokenEndpoint)
        {
            Content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                { "grant_type", "authorization_code" },
                { "code", code },
                { "redirect_uri", redirectUri },
                { "client_id", clientId! },
                { "client_secret", clientSecret! },
                { "scope", "openid profile email" }
            })
        };

        var response = await _httpClient.SendAsync(request);
        var content = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Token exchange failed: {StatusCode} - {Content}", response.StatusCode, content);
            throw new InvalidOperationException($"Failed to exchange code for token: {content}");
        }

        var openIdConnectMessage = new OpenIdConnectMessage(content);
        return openIdConnectMessage;
    }

    public async Task<ClaimsPrincipal?> ValidateAndGetClaimsAsync(string idToken)
    {
        var tenantId = _configuration["AzureAd:TenantId"];
        var clientId = _configuration["AzureAd:ClientId"];
        var authority = _configuration["AzureAd:Authority"]?.Replace("{TenantId}", tenantId);

        try
        {
            // Get the public keys from Microsoft's JWKS endpoint
            var jwksUri = $"{authority}/discovery/v2.0/keys";
            var jwksResponse = await _httpClient.GetAsync(jwksUri);
            var jwksContent = await jwksResponse.Content.ReadAsStringAsync();

            var configurationManager = new Microsoft.IdentityModel.Protocols.ConfigurationManager<OpenIdConnectConfiguration>(
                $"{authority}/.well-known/openid-configuration",
                new OpenIdConnectConfigurationRetriever(),
                _httpClient);

            var config = await configurationManager.GetConfigurationAsync();
            var signingKeys = config.SigningKeys;

            var tokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = $"{authority}/v2.0",
                ValidateAudience = true,
                ValidAudience = clientId,
                ValidateLifetime = true,
                IssuerSigningKeys = signingKeys,
                ClockSkew = TimeSpan.FromSeconds(30)
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var principal = tokenHandler.ValidateToken(idToken, tokenValidationParameters, out SecurityToken validatedToken);

            return principal;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to validate ID token");
            return null;
        }
    }

    public string GenerateJwtToken(string email, string displayName)
    {
        var jwtIssuer = _configuration["Jwt:Issuer"] ?? "my-toggle-service";
        var jwtAudience = _configuration["Jwt:Audience"] ?? "my-toggle-service-internal";
        var jwtKey = _configuration["Jwt:Key"] ?? "dev-only-key-change-this-in-prod-123456789";

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.Email, email),
            new Claim("displayName", displayName ?? email),
            new Claim(ClaimTypes.NameIdentifier, email)
        };

        var token = new JwtSecurityToken(
            issuer: jwtIssuer,
            audience: jwtAudience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
