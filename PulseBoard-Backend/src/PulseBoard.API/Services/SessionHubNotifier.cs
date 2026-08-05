using Microsoft.AspNetCore.SignalR;
using PulseBoard.API.Hubs;
using PulseBoard.Application.Common.Interfaces;
using PulseBoard.Application.Common.Models;

namespace PulseBoard.API.Services;

public class SessionHubNotifier : ISessionHubNotifier
{
    private readonly IHubContext<SessionHub> _hubContext;

    public SessionHubNotifier(IHubContext<SessionHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public Task PollActivated(Guid sessionId, PollDto poll) =>
        _hubContext.Clients.Group(SessionHub.GroupName(sessionId.ToString()))
            .SendAsync("PollActivated", poll);

    public Task PollResultsUpdated(Guid sessionId, PollResultsDto results) =>
        _hubContext.Clients.Group(SessionHub.GroupName(sessionId.ToString()))
            .SendAsync("PollResultsUpdated", results);

    public Task PollClosed(Guid sessionId, Guid pollId) =>
        _hubContext.Clients.Group(SessionHub.GroupName(sessionId.ToString()))
            .SendAsync("PollClosed", pollId);
}
