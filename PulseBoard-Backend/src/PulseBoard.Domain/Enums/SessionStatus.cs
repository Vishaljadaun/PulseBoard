namespace PulseBoard.Domain.Enums;

/// <summary>
/// Lifecycle of a PulseBoard session.
///   Draft -> Live -> Ended
/// A session can only move forward through this pipeline, never backward.
/// </summary>
public enum SessionStatus
{
    Draft = 0,
    Live = 1,
    Ended = 2
}
