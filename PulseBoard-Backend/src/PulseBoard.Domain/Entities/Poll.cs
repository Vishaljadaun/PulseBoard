using PulseBoard.Domain.Common;
using PulseBoard.Domain.Enums;

namespace PulseBoard.Domain.Entities;

public class Poll : BaseEntity
{
    public Guid SessionId { get; set; }
    public Session? Session { get; set; }

    public string Question { get; set; } = string.Empty;
    public PollStatus Status { get; set; } = PollStatus.Draft;

    public DateTime? ActivatedAt { get; set; }
    public DateTime? ClosedAt { get; set; }

    public ICollection<PollOption> Options { get; set; } = new List<PollOption>();

    public void Activate()
    {
        if (Status != PollStatus.Draft)
            throw new InvalidOperationException(
                $"Cannot activate a poll that is currently '{Status}'. Only Draft polls can be activated.");

        Status = PollStatus.Active;
        ActivatedAt = DateTime.UtcNow;
    }

    public void Close()
    {
        if (Status != PollStatus.Active)
            throw new InvalidOperationException(
                $"Cannot close a poll that is currently '{Status}'. Only Active polls can be closed.");

        Status = PollStatus.Closed;
        ClosedAt = DateTime.UtcNow;
    }
}

public class PollOption : BaseEntity
{
    public Guid PollId { get; set; }
    public Poll? Poll { get; set; }

    public string Text { get; set; } = string.Empty;

    public ICollection<Vote> Votes { get; set; } = new List<Vote>();
}

public class Vote : BaseEntity
{
    public Guid PollOptionId { get; set; }
    public PollOption? PollOption { get; set; }

    /// <summary>
    /// Anonymous participant identity — a GUID generated client-side and
    /// stored in the browser (not tied to any account, since participants
    /// never register). Used only to block double-voting on the same poll.
    /// </summary>
    public Guid ParticipantId { get; set; }
}
