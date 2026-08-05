using Microsoft.AspNetCore.SignalR;

namespace PulseBoard.API.Hubs;

/// <summary>
/// One SignalR group per session (group name = session ID as a string).
/// Both the host's dashboard and every participant's browser join the same
/// group for their session, so a single broadcast reaches everyone watching
/// that session at once — this is the mechanism behind "live" voting.
/// </summary>
public class SessionHub : Hub
{
    /// <summary>Called by the client right after connecting, with the session ID from the URL/join code flow.</summary>
    public async Task JoinSession(string sessionId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, GroupName(sessionId));
    }

    public async Task LeaveSession(string sessionId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, GroupName(sessionId));
    }

    public static string GroupName(string sessionId) => $"session-{sessionId}";
}
