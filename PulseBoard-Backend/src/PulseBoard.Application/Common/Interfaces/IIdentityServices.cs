using PulseBoard.Domain.Entities;

namespace PulseBoard.Application.Common.Interfaces;

public interface IPasswordHasher
{
    string Hash(string password);
    bool Verify(string password, string hash);
}

public interface IJwtTokenGenerator
{
    string GenerateToken(Host host);
}

/// <summary>
/// Generates a unique 6-digit join code for a new session. Implemented in
/// Infrastructure so it can check the database for collisions.
/// </summary>
public interface IJoinCodeGenerator
{
    Task<string> GenerateUniqueCodeAsync(CancellationToken cancellationToken);
}
