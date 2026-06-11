using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace MyToggleService.Client;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddMyToggleServiceClient(
        this IServiceCollection services,
        Action<MyToggleServiceClientOptions> configure,
        Func<CancellationToken, ValueTask<string?>> bearerTokenProvider)
    {
        ArgumentNullException.ThrowIfNull(bearerTokenProvider);

        return services.AddMyToggleServiceClient(options =>
        {
            configure(options);
            options.BearerTokenProvider = bearerTokenProvider;
        });
    }

    public static IServiceCollection AddMyToggleServiceClient(
        this IServiceCollection services,
        Action<MyToggleServiceClientOptions> configure,
        Func<CancellationToken, Task<string?>> bearerTokenProvider)
    {
        ArgumentNullException.ThrowIfNull(bearerTokenProvider);

        return services.AddMyToggleServiceClient(
            configure,
            cancellationToken => new ValueTask<string?>(bearerTokenProvider(cancellationToken)));
    }

    public static IServiceCollection AddMyToggleServiceClient(
        this IServiceCollection services,
        Action<MyToggleServiceClientOptions> configure)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configure);

        services.AddOptions<MyToggleServiceClientOptions>().Configure(configure);

        services.AddHttpClient<IMyToggleServiceClient, MyToggleServiceClient>((sp, client) =>
        {
            var options = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<MyToggleServiceClientOptions>>().Value;

            if (options.BaseAddress is null || !options.BaseAddress.IsAbsoluteUri)
            {
                throw new InvalidOperationException("MyToggleServiceClient BaseAddress must be an absolute URI.");
            }

            if (options.Timeout <= TimeSpan.Zero)
            {
                throw new InvalidOperationException("MyToggleServiceClient Timeout must be greater than zero.");
            }

            if (options.ApplicationId == Guid.Empty)
            {
                throw new InvalidOperationException("MyToggleServiceClient ApplicationId must be configured.");
            }

            client.BaseAddress = options.BaseAddress;
            client.Timeout = options.Timeout;
        });

        return services;
    }
}
