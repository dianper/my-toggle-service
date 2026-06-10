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
    options.BearerToken = "<token>";
});
```

## Usage

```csharp
using MyToggleService.Client;

var response = await client.EvaluateAsync(applicationId, "checkout.new-flow", tenantId);
if (response.IsEnabled)
{
    // feature enabled
}
```
