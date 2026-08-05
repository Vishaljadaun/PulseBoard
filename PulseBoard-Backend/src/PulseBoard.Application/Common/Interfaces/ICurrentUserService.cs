namespace PulseBoard.Application.Common.Interfaces;

/// <summary>
/// Gives command/query handlers access to "who is making this request" without
/// the Application layer knowing anything about HttpContext or JWTs.
/// </summary>
public interface ICurrentUserService
{
    Guid? HostId { get; }
}
