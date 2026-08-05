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

/// <summary>Thrown when the AI provider call fails or returns something unusable. Mapped to 400 in the API — the host just types the poll manually instead.</summary>
public class AiGenerationException : Exception
{
    public AiGenerationException(string message) : base(message) { }
    public AiGenerationException(string message, Exception inner) : base(message, inner) { }
}
