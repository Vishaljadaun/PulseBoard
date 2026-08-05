namespace PulseBoard.Domain.Enums;

/// <summary>
/// Draft -> Active -> Closed. Only one poll per session can be Active at a
/// time (enforced in the ActivatePoll handler, not here, since that rule
/// spans multiple polls — outside a single entity's responsibility).
/// </summary>
public enum PollStatus
{
    Draft = 0,
    Active = 1,
    Closed = 2
}
