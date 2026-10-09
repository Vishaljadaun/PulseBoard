namespace PulseBoard.Application.Common.Exceptions;

/// <summary>Thrown when a requested entity (session, host) doesn't exist. Mapped to 404 in the API.</summary>
public class NotFoundException : Exception
{
    public NotFoundException(string name, object key)
        : base($"Entity \"{name}\" ({key}) was not found.") { }
}

/// <summary>Thrown for business-rule violations, e.g. invalid state transitions or duplicate email. Mapped to 400 in the API.</summary>
public class BusinessRuleException : Exception
{
    public BusinessRuleException(string message) : base(message) { }
}

/// <summary>Thrown when login credentials are invalid. Mapped to 401 in the API.</summary>
public class UnauthorizedException : Exception
{
    public UnauthorizedException(string message) : base(message) { }
}

/// <summary>A safe, actionable AI failure. Provider response bodies and credentials stay private.</summary>
public class AiGenerationException : Exception
{
    public string Code { get; }
    public bool Retryable { get; }
    public AiGenerationException(string message, string code = "ai_invalid_response", bool retryable = true, Exception? inner = null)
        : base(message, inner) { Code = code; Retryable = retryable; }
}
