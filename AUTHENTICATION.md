# Microsoft/Azure AD Authentication

## Overview

The service now uses **OAuth2 Authorization Code Flow** with a **BFF (Backend for Frontend)** pattern for Microsoft authentication.

**Flow:**
1. The user clicks "Login with Microsoft" on the login page.
2. The backend redirects the user to Microsoft Login (labs.fortytwo.io tenant).
3. The user signs in with an @labs.fortytwo.io email.
4. Microsoft returns an authorization code.
5. The backend validates the code, obtains a Microsoft token, and generates an internal JWT.
6. The JWT is returned in an httpOnly cookie (secure, not accessible from JS).
7. The frontend redirects to home (authenticated).

---

## Azure AD Setup

### Prerequisites
- Access to Azure Portal with an admin account in the labs.fortytwo.io tenant.
- Permission to create App Registrations.

### Step 1: Register the Application

1. Open [Azure Portal](https://portal.azure.com)
2. Go to **Azure Active Directory** -> **App registrations**
3. Click **New registration**
4. Fill in:
   - **Name**: `Toggle Service Internal`
   - **Supported account types**: Select `Accounts in this organizational directory only (labs.fortytwo.io only)`
   - **Redirect URI**:
     - Platform: **Web**
     - URI: `https://localhost:5001/auth/callback` (development)
5. Click **Register**

### Step 2: Copy Credentials

On the app page:

1. Click **Overview**
2. Copy and save:
   - **Application (client) ID**
   - **Directory (tenant) ID**

3. Go to **Certificates & secrets**
4. Click **New client secret**
5. Configure:
   - **Description**: `Dev Token`
   - **Expires**: Choose an appropriate period (for example, 6 months)
6. Click **Add**
7. **Copy the Value** (shown only once) and store it safely

### Step 3: Configure API Permissions

1. In the app, go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Click **Delegated permissions**
5. Search for and add:
   - `User.Read`
   - `openid`
   - `profile`
   - `email`
6. Click **Add permissions**

**Note**: Admin consent is not required for development, since users grant consent during login.

### Step 4: Configure Production Redirect URIs (Future)

When you are ready for production:

1. In the app, go to **Authentication** -> **Redirect URIs**
2. Add the production URI:
   - `https://toggle-service.labs.fortytwo.io/auth/callback`
3. Click **Save**

---

## Local Configuration (Development)

### Step 1: Add Secrets

In the `MyToggleService.ApiService/` directory:

```bash
# Set secrets (replace with the values obtained from Azure AD)
dotnet user-secrets set "AzureAd:TenantId" "YOUR_TENANT_ID"
dotnet user-secrets set "AzureAd:ClientId" "YOUR_CLIENT_ID"
dotnet user-secrets set "AzureAd:ClientSecret" "YOUR_CLIENT_SECRET"
```

**Where to get these values:**
- `TenantId`: Azure Portal -> Azure AD -> Properties -> Tenant ID
- `ClientId`: App registration -> Overview -> Application (client) ID
- `ClientSecret`: App registration -> Certificates & secrets -> Value (copied above)

### Step 2: Verify appsettings.json

The `MyToggleService.ApiService/appsettings.json` file already contains the base configuration. User secrets will override the empty values.

```json
{
  "AzureAd": {
    "TenantId": "",  // Filled by dotnet user-secrets
    "ClientId": "",  // Filled by dotnet user-secrets
    "ClientSecret": "",  // Filled by dotnet user-secrets
    "Authority": "https://login.microsoftonline.com/{TenantId}",
    "RedirectUri": "https://localhost:5001/auth/callback"
  }
}
```

---

## Test Locally

### Terminal 1: Backend

```bash
cd MyToggleService.ApiService
dotnet build
dotnet run
```

Backend will run at: `https://localhost:5001`

### Terminal 2: Frontend

```bash
cd MyToggleService.Web
npm install  # First time only
npm run dev
```

Frontend will run at: `http://localhost:5173`

### Terminal 3: Database (if using local PostgreSQL)

```bash
# If using Docker
docker run --name toggledb -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:latest
```

### Test in the Browser

1. Open `http://localhost:5173`
2. It should redirect to `/login`
3. Click **Login with Microsoft**
4. You will be redirected to Microsoft Login
5. Sign in with your @labs.fortytwo.io email
6. If successful, you will be redirected to the authenticated home page

### Verify Authentication

Open **DevTools** (F12):

1. Go to **Application** -> **Cookies** -> `localhost`
2. Look for the `auth_token` cookie
3. Verify:
   - ✅ `HttpOnly`: checked (essential for security)
   - ✅ `Secure`: checked in HTTPS/production
   - ✅ `SameSite`: Strict

---

## Authentication Endpoints

All authentication endpoints are under `/auth`:

### GET `/auth/signin`
Starts OAuth2 Authorization Code Flow. Redirects the user to Microsoft Login.

**Response**: Redirect to Microsoft (302)

### GET `/auth/callback?code=...&state=...`
Microsoft OAuth callback. Exchanges the code for tokens and generates a JWT.

**Response**:
- Success: Sets `auth_token` cookie + redirects to `/` (302)
- Error: Redirects to `/login?error=...` (302)

### GET `/auth/me`
Returns authenticated user information.

**Authentication**: Required (`auth_token` cookie)

**Response**:
```json
{
  "email": "user@labs.fortytwo.io",
  "displayName": "John Doe"
}
```

### POST `/auth/logout`
Logs out the user by clearing authentication.

**Authentication**: Required

**Response**:
```json
{
  "message": "Logged out successfully"
}
```

Frontend automatically redirects to `/login`.

---

## Code Structure

### Backend (ASP.NET Core)

- `Services/AuthenticationService.cs` - OAuth2 logic (Code Flow, token exchange, validation)
- `Controllers/AuthController.cs` - Authentication HTTP endpoints
- `Program.cs` - Middleware setup (Cookies, Session, JWT)

### Frontend (React)

- `pages/Login/LoginPage.tsx` - Login screen with Microsoft button
- `context/AppContext.tsx` - Global state (user, isAuthenticated, logout)
- `api.ts` - `getMe()`, `logout()` with cookie support
- `layouts/MainLayout.tsx` - Navbar with email + logout

---

## Security

### Cookie (httpOnly)
- ✅ `HttpOnly`: Token is not accessible from JavaScript (prevents XSS)
- ✅ `Secure`: HTTPS only (prevents MITM in production)
- ✅ `SameSite=Strict`: Prevents CSRF
- ✅ Automatically expires after 8 hours

### CSRF Protection
- ✅ OAuth2 `state` parameter validated in callback
- ✅ Session storage used to store state

### Token Validation
- ✅ Microsoft token signature validated against Azure AD JWKS
- ✅ Issuer and Audience validated
- ✅ Lifetime (expiration) validated

### CORS
- ✅ Only `http://localhost:5173` (dev) and future production domain can make requests
- ✅ `AllowCredentials=true` (allows cookies)

---

## Troubleshooting

### Error: "State validation failed"
- **Cause**: Session cookie was not saved or expired
- **Solution**: Clear browser cookies and try again

### Error: "ID token validation failed"
- **Cause**: Invalid Microsoft token or incorrect credentials
- **Solution**: Verify `ClientId` and `ClientSecret`

### Error: "Failed to exchange code for token"
- **Cause**: Incorrect Azure AD credentials or redirect URI not registered
- **Solution**: Check Azure Portal -> App registration -> Redirect URIs

### Error: "Unauthorized" when accessing protected endpoints
- **Cause**: `auth_token` cookie expired or was not set
- **Solution**: Log out (DELETE `/auth/logout`) and sign in again

### User sees "Only @labs.fortytwo.io accounts are allowed" but could still sign in
- **Cause**: Azure AD allowed sign-in from another tenant (personal account or different Azure AD)
- **Solution**: Set Supported account types to `Accounts in this organizational directory only` (already done)

---

## Next Steps

### Future: Multi-Tenant Support
If you need to add `services` tenant:

1. Register a new app in Azure AD for services.fortytwo.io tenant
2. Add route `GET /auth/signin?tenant=services`
3. Backend selects ClientId/Secret/TenantId based on the parameter

### Future: Authorization by Roles/Groups
If you need to control access by Azure AD groups:

1. Add `Microsoft.Graph` NuGet package
2. In callback, fetch groups: `GET /me/memberOf`
3. Add group claim to JWT
4. Use `[Authorize(Roles = "GroupName")]` on endpoints

---

## References

- [Microsoft Identity Platform](https://docs.microsoft.com/en-us/azure/active-directory/develop/)
- [OAuth2 Authorization Code Flow](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow)
- [ASP.NET Core Authentication](https://docs.microsoft.com/en-us/aspnet/core/security/authentication/)
- [Azure AD App Registration](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
