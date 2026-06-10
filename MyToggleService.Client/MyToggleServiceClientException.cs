using System.Net;

namespace MyToggleService.Client;

public sealed class MyToggleServiceClientException : Exception
{
    public MyToggleServiceClientException(HttpStatusCode statusCode, string message, string? responseBody)
        : base(message)
    {
        StatusCode = statusCode;
        ResponseBody = responseBody;
    }

    public HttpStatusCode StatusCode { get; }

    public string? ResponseBody { get; }
}
