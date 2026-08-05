using PulseBoard.Domain.Common;
using PulseBoard.Domain.Enums;

namespace PulseBoard.Domain.Entities;

/// <summary>
/// A live session created by a Host. Participants join using JoinCode.
/// State transitions are enforced here (not in the API layer) so the
/// rule "you can't start an Ended session" can never be bypassed,
/// regardless of which command calls into it.
/// </summary>
public class Session : BaseEntity
{
    public Guid HostId { get; set; }
    public Host? Host { get; set; }

    public string Title { get; set; } = string.Empty;
    public string Topic { get; set; } = string.Empty;

    /// <summary>6-digit code participants use to join. Unique across all sessions.</summary>
    public string JoinCode { get; set; } = string.Empty;

    public SessionStatus Status { get; set; } = SessionStatus.Draft;

    public DateTime? StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }

    public void Start()
    {
        if (Status != SessionStatus.Draft)
            throw new InvalidOperationException(
                $"Cannot start a session that is currently '{Status}'. Only Draft sessions can be started.");

        Status = SessionStatus.Live;
        StartedAt = DateTime.UtcNow;
    }

    public void End()
    {
        if (Status != SessionStatus.Live)
            throw new InvalidOperationException(
                $"Cannot end a session that is currently '{Status}'. Only Live sessions can be ended.");

        Status = SessionStatus.Ended;
        EndedAt = DateTime.UtcNow;
    }
}
