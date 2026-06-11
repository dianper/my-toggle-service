var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder
    .AddPostgres("postgres")
    .WithDataVolume()
    .WithPgAdmin();

var togglesDb = postgres.AddDatabase("togglesdb");

var apiService = builder.AddProject<Projects.MyToggleService_ApiService>("apiservice")
    .WithHttpHealthCheck("/health")
    .WithReference(togglesDb)
    .WaitFor(togglesDb);

builder.AddNpmApp("webfrontend", "../MyToggleService.Web", "dev")
    .WithExternalHttpEndpoints()
    .WithReference(apiService)
    .WaitFor(apiService);

builder.Build().Run();
