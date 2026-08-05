using Microsoft.AspNetCore.Identity;
using PulseBoard.Application.Common.Interfaces;
using PulseBoard.Domain.Entities;

namespace PulseBoard.Infrastructure.Services;

/// <summary>
/// Wraps ASP.NET Core Identity's PasswordHasher<T> (PBKDF2 under the hood) —
/// battle-tested, no need to pull in a separate BCrypt package.
/// </summary>
public class PasswordHasher : IPasswordHasher
{
    private readonly Microsoft.AspNetCore.Identity.IPasswordHasher<Host> _identityHasher = new PasswordHasher<Host>();

    public string Hash(string password)
    {
        // The Host instance is only used by the hasher to salt-mix; a placeholder is fine here.
        return _identityHasher.HashPassword(new Host(), password);
    }

    public bool Verify(string password, string hash)
    {
        var result = _identityHasher.VerifyHashedPassword(new Host(), hash, password);
        return result is PasswordVerificationResult.Success or PasswordVerificationResult.SuccessRehashNeeded;
    }
}
