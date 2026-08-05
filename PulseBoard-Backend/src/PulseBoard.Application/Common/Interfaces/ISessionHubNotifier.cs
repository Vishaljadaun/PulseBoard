using PulseBoard.Application.Common.Models;

namespace PulseBoard.Application.Common.Interfaces;

/// <summary>
/// Lets command handlers push real-time updates without knowing anything
/// about SignalR — the concrete implementation (using IHubContext) lives in
/// PulseBoard.API, since Application must never reference ASP.NET Core's
/// SignalR package directly (Clean Architecture dependency rule).
/// </summary>
public interface ISessionHubNotifier
{
    Task PollActivated(Guid sessionId, PollDto poll);
    Task PollResultsUpdated(Guid sessionId, PollResultsDto results);
    Task PollClosed(Guid sessionId, Guid pollId);
}
