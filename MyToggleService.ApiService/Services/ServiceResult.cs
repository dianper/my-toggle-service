namespace MyToggleService.ApiService.Services;

public sealed record ServiceResult(int StatusCode, object? Payload = null, string? Location = null)
{
    public static ServiceResult Ok(object payload) => new(200, payload);
    public static ServiceResult Created(string location, object payload) => new(201, payload, location);
    public static ServiceResult NoContent() => new(204);
    public static ServiceResult BadRequest(object payload) => new(400, payload);
    public static ServiceResult NotFound() => new(404);
    public static ServiceResult Conflict(object payload) => new(409, payload);
}
