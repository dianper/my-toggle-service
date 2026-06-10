using System.Globalization;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using MyToggleService.Client.Models;
using Microsoft.Extensions.Options;

namespace MyToggleService.Client;

public sealed class MyToggleServiceClient : IMyToggleServiceClient
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly HttpClient _httpClient;
    private readonly MyToggleServiceClientOptions _options;

    public MyToggleServiceClient(HttpClient httpClient, IOptions<MyToggleServiceClientOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value;
    }

    public async Task<EvaluateToggleResponse> EvaluateAsync(
        Guid applicationId,
        string key,
        Guid? tenantId = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(key))
        {
            throw new ArgumentException("Toggle key is required.", nameof(key));
        }

        var path = BuildPathWithQuery(
            "/api/evaluate/single",
            ("applicationId", applicationId.ToString()),
            ("key", key),
            ("tenantId", tenantId?.ToString()));

        using var request = new HttpRequestMessage(HttpMethod.Get, path);
        await AddAuthorizationHeaderAsync(request, cancellationToken);

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        await EnsureSuccessAsync(response, cancellationToken);

        var model = await response.Content.ReadFromJsonAsync<EvaluateToggleResponse>(JsonOptions, cancellationToken);
        return model ?? throw new MyToggleServiceClientException(
            response.StatusCode,
            "Empty response when evaluating feature toggle.",
            null);
    }

    public async Task<IReadOnlyList<EvaluateToggleResponse>> EvaluateBatchAsync(
        Guid applicationId,
        IEnumerable<string> keys,
        Guid? tenantId = null,
        CancellationToken cancellationToken = default)
    {
        var requestModel = new
        {
            applicationId,
            tenantId,
            keys = keys.Where(x => !string.IsNullOrWhiteSpace(x)).Distinct(StringComparer.OrdinalIgnoreCase).ToArray()
        };

        if (requestModel.keys.Length == 0)
        {
            throw new ArgumentException("At least one toggle key must be provided.", nameof(keys));
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/evaluate/batch")
        {
            Content = JsonContent.Create(requestModel)
        };

        await AddAuthorizationHeaderAsync(request, cancellationToken);

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        await EnsureSuccessAsync(response, cancellationToken);

        var model = await response.Content.ReadFromJsonAsync<EvaluateBatchResult>(JsonOptions, cancellationToken);
        return model?.Toggles ?? throw new MyToggleServiceClientException(
            response.StatusCode,
            "Empty response when evaluating feature toggles in batch.",
            null);
    }

    public async Task<IReadOnlyList<ToggleDto>> ListTogglesAsync(
        Guid? applicationId = null,
        Guid? tenantId = null,
        bool includeGlobal = true,
        CancellationToken cancellationToken = default)
    {
        var path = BuildPathWithQuery(
            "/api/toggles",
            ("applicationId", applicationId?.ToString()),
            ("tenantId", tenantId?.ToString()),
            ("includeGlobal", includeGlobal.ToString(CultureInfo.InvariantCulture).ToLowerInvariant()));

        using var request = new HttpRequestMessage(HttpMethod.Get, path);
        await AddAuthorizationHeaderAsync(request, cancellationToken);

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        await EnsureSuccessAsync(response, cancellationToken);

        var model = await response.Content.ReadFromJsonAsync<List<ToggleDto>>(JsonOptions, cancellationToken);
        return model ?? [];
    }

    private async Task AddAuthorizationHeaderAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var token = _options.BearerToken;

        if (_options.BearerTokenProvider is not null)
        {
            token = await _options.BearerTokenProvider(cancellationToken);
        }

        if (!string.IsNullOrWhiteSpace(token))
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }
    }

    private static async Task EnsureSuccessAsync(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        if (response.IsSuccessStatusCode)
        {
            return;
        }

        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
        throw new MyToggleServiceClientException(
            response.StatusCode,
            $"MyToggleService request failed with status {(int)response.StatusCode}.",
            responseBody);
    }

    private static string BuildPathWithQuery(string path, params (string Key, string? Value)[] query)
    {
        var parts = query
            .Where(x => !string.IsNullOrWhiteSpace(x.Value))
            .Select(x => $"{Uri.EscapeDataString(x.Key)}={Uri.EscapeDataString(x.Value!)}")
            .ToArray();

        if (parts.Length == 0)
        {
            return path;
        }

        return $"{path}?{string.Join("&", parts)}";
    }

    private sealed record EvaluateBatchResult(List<EvaluateToggleResponse> Toggles);
}
