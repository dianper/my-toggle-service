using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace MyToggleService.Client;

public static class ServiceCollectionExtensions
{
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
            client.BaseAddress = options.BaseAddress;
            client.Timeout = options.Timeout;
        });

        return services;
    }
}
