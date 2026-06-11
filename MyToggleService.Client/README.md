# MyToggleService.Client

.NET SDK to query feature toggle status from the MyToggleService API.

## Installation

```bash
dotnet add package MyToggleService.Client
```

## DI Registration

```csharp
using MyToggleService.Client;

builder.Services.AddMyToggleServiceClient(options =>
{
    options.BaseAddress = new Uri("https://localhost:7591");
    options.ApplicationId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    options.BearerToken = "<token>";
});
```

## DI Registration with Token Provider

```csharp
using MyToggleService.Client;

builder.Services.AddMyToggleServiceClient(
    options =>
    {
        options.BaseAddress = new Uri("https://localhost:7591");
        options.ApplicationId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    },
    async cancellationToken =>
    {
        // Called for each request
        return await tokenProvider.GetTokenAsync(cancellationToken);
    });
});
```

## Usage

```csharp
using MyToggleService.Client;

var response = await client.EvaluateAsync("checkout.new-flow", tenantId);
if (response.IsEnabled)
{
    // feature enabled
}

var batch = await client.EvaluateBatchAsync(new[]
{
    "checkout.new-flow",
    "billing.new-card"
}, tenantId);

var toggles = await client.ListTogglesAsync(tenantId, includeGlobal: true);
```
