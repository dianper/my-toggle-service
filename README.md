# MyToggleService

Lightweight centralized feature toggle service.

## Stack

- .NET Aspire (AppHost)
- .NET 10 Minimal API
- PostgreSQL (Docker)
- EF Core + Npgsql provider
- React + Tailwind (Vite)

## Solution Layout

- `MyToggleService.AppHost`: Aspire orchestrator (API, PostgreSQL, pgAdmin, React app)
- `MyToggleService.ApiService`: toggle API, JWT auth, EF Core/PostgreSQL
- `MyToggleService.ServiceDefaults`: shared observability/health defaults
- `MyToggleService.Web`: admin UI

## Prerequisites

- .NET SDK 10
- Docker Desktop running
- Node.js 20+

## Run Locally

1. Build solution:

   ```bash
   dotnet build MyToggleService.sln
   ```

2. Start Aspire AppHost:

   ```bash
   dotnet run --project MyToggleService.AppHost/MyToggleService.AppHost.csproj
   ```

3. Open the dashboard URL printed in terminal and launch `webfrontend`.

## Data Model (MVP)

Each row is one toggle rule:

- `id`
- `key`
- `application`
- `tenantId` nullable
- `isEnabled`
- `createdAt`
- `updatedAt`

Scope semantics:

- `tenantId = null`: global rule
- `tenantId = value`: tenant-specific rule

Resolution order:

1. Tenant-specific rule
2. Global rule
3. Fallback `disabled`

Note: API accepts `tenantIds` list on create and persists one row per tenant.

## Authentication

Protected endpoints use JWT Bearer.

Development helper endpoint:

- `POST /api/auth/dev-token?subject=web-admin`

Returns a valid Bearer token for local development.

## Main Endpoints

- `GET /api/toggles`
- `POST /api/toggles`
- `PUT /api/toggles/{id}`
- `PATCH /api/toggles/{id}/enabled`
- `DELETE /api/toggles/{id}`
- `GET /api/evaluate/single`
- `POST /api/evaluate/batch`

## Frontend Notes

- UI is fully in English.
- Dark/Light mode switch in header.
- Theme uses a moss-green based palette.

## Troubleshooting

- If Docker is stopped or unhealthy, AppHost dashboard may start but PostgreSQL resources will not.
- If needed, rebuild and rerun AppHost after Docker is healthy.
