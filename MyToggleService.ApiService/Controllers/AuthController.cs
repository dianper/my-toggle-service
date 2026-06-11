using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyToggleService.ApiService.Services;

namespace MyToggleService.ApiService.Controllers;

[ApiController]
[Route("auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthenticationService _authService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        IAuthenticationService authService,
        ILogger<AuthController> logger)
    {
        _authService = authService;
        _logger = logger;
    }

    /// <summary>
    /// Initiates the OAuth2 Code Flow with Microsoft
    /// Redirects user to Microsoft Login
    /// </summary>
    [HttpGet("signin")]
    [AllowAnonymous]
    public IActionResult SignIn()
    {
        try
        {
            var state = Guid.NewGuid().ToString();
            HttpContext.Session.SetString("auth_state", state);

            var redirectUri = $"{Request.Scheme}://{Request.Host}/auth/callback";
            var authorizationUrl = _authService.GetAuthorizationUrl(redirectUri, state);

            return Redirect(authorizationUrl);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error initiating OAuth flow");
            return BadRequest(new { error = "Failed to initiate authentication" });
        }
    }

    /// <summary>
    /// Callback endpoint from Microsoft OAuth2
    /// Exchanges authorization code for tokens
    /// </summary>
    [HttpGet("callback")]
    [AllowAnonymous]
    public async Task<IActionResult> Callback(string code, string state, string? error, string? error_description)
    {
        try
        {
            // Check for errors from Microsoft
            if (!string.IsNullOrEmpty(error))
            {
                _logger.LogWarning("OAuth callback error: {Error} - {Description}", error, error_description);
                return Redirect("/login?error=authentication_failed");
            }

            // Validate state parameter (CSRF protection)
            var storedState = HttpContext.Session.GetString("auth_state");
            if (string.IsNullOrEmpty(storedState) || storedState != state)
            {
                _logger.LogWarning("State validation failed");
                return Redirect("/login?error=state_mismatch");
            }

            HttpContext.Session.Remove("auth_state");

            // Exchange code for token
            var redirectUri = $"{Request.Scheme}://{Request.Host}/auth/callback";
            var tokenResponse = await _authService.ExchangeCodeForTokenAsync(code, redirectUri);

            if (string.IsNullOrEmpty(tokenResponse.IdToken))
            {
                _logger.LogWarning("No ID token in response");
                return Redirect("/login?error=no_id_token");
            }

            // Validate ID token and get claims
            var principal = await _authService.ValidateAndGetClaimsAsync(tokenResponse.IdToken);
            if (principal == null)
            {
                _logger.LogWarning("ID token validation failed");
                return Redirect("/login?error=token_validation_failed");
            }

            // Extract email and display name from claims
            var email = principal.FindFirst(ClaimTypes.Email)?.Value 
                ?? principal.FindFirst("preferred_username")?.Value
                ?? "unknown";
            
            var displayName = principal.FindFirst(ClaimTypes.Name)?.Value 
                ?? principal.FindFirst("given_name")?.Value
                ?? email;

            // Generate internal JWT token
            var jwtToken = _authService.GenerateJwtToken(email, displayName);

            // Set JWT token in httpOnly cookie
            Response.Cookies.Append(
                "auth_token",
                jwtToken,
                new CookieOptions
                {
                    HttpOnly = true,
                    Secure = Request.IsHttps,
                    SameSite = SameSiteMode.Strict,
                    Expires = DateTime.UtcNow.AddHours(8)
                });

            _logger.LogInformation("User authenticated: {Email}", email);

            // Redirect to home
            return Redirect("/");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in OAuth callback");
            return Redirect("/login?error=callback_error");
        }
    }

    /// <summary>
    /// Returns authenticated user information
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    public IActionResult GetMe()
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        var displayName = User.FindFirst("displayName")?.Value;

        if (string.IsNullOrEmpty(email))
        {
            return Unauthorized();
        }

        return Ok(new
        {
            email,
            displayName
        });
    }

    /// <summary>
    /// Logs out the user by clearing the auth cookie
    /// </summary>
    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout()
    {
        Response.Cookies.Delete("auth_token");
        return Ok(new { message = "Logged out successfully" });
    }
}
