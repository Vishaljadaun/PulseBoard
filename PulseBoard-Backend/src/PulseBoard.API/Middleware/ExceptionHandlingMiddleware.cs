using System.Net;
using System.Text.Json;
using FluentValidation;
using PulseBoard.Application.Common.Exceptions;

namespace PulseBoard.API.Middleware;

/// <summary>
/// Catches exceptions thrown anywhere in the pipeline and converts them into
/// a consistent JSON error shape + the right HTTP status code, so controllers
/// never need try/catch blocks.
/// </summary>
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception while processing {Method} {Path}", context.Request.Method, context.Request.Path);
            await HandleExceptionAsync(context, ex);
        }
    }

    private static Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (statusCode, message) = exception switch
        {
            NotFoundException => (HttpStatusCode.NotFound, exception.Message),
            UnauthorizedException => (HttpStatusCode.Unauthorized, exception.Message),
            BusinessRuleException => (HttpStatusCode.BadRequest, exception.Message),
            AiGenerationException ai => (ai.Code switch
            {
                "ai_rate_limited" => HttpStatusCode.TooManyRequests,
                "ai_timeout" => HttpStatusCode.GatewayTimeout,
                "ai_configuration" => HttpStatusCode.ServiceUnavailable,
                _ => HttpStatusCode.BadGateway
            }, ai.Message),
            ValidationException validationEx => (HttpStatusCode.BadRequest,
                string.Join(" | ", validationEx.Errors.Select(e => e.ErrorMessage))),
            _ => (HttpStatusCode.InternalServerError, "An unexpected error occurred.")
        };

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)statusCode;

        var aiError = exception as AiGenerationException;
        var payload = JsonSerializer.Serialize(new { error = message, code = aiError?.Code, retryable = aiError?.Retryable });
        return context.Response.WriteAsync(payload);
    }
}
