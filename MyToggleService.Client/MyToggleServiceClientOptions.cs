namespace MyToggleService.Client;

public sealed class MyToggleServiceClientOptions
{
    public Uri BaseAddress { get; set; } = new("http://localhost:8080");

    public TimeSpan Timeout { get; set; } = TimeSpan.FromSeconds(30);

    public string? BearerToken { get; set; }

    public Func<CancellationToken, ValueTask<string?>>? BearerTokenProvider { get; set; }
}
