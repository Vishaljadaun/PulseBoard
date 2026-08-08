namespace PulseBoard.Application.Common.Models;

public record PollOptionDto(Guid Id, string Text);

/// <summary>
/// Participant/broadcast-safe poll shape — deliberately has NO correct-answer
/// field. This is what goes out over SignalR broadcasts (everyone in the
/// session group receives those, including people who haven't voted yet)
/// and what the public "get active poll" endpoint returns. Never add a
/// correct-answer field here — use HostPollDto for anything host-only.
/// </summary>
public record PollDto(
    Guid Id,
    Guid SessionId,
    string Question,
    string Status,
    DateTime CreatedAt,
    DateTime? ActivatedAt,
    DateTime? ClosedAt,
    List<PollOptionDto> Options);

/// <summary>
/// Host-only poll shape — includes which option (if any) is the correct
/// answer. Only ever returned from endpoints that require the host's own
/// JWT (CreatePoll, GetSessionPolls) — never broadcast, never returned from
/// a public/anonymous endpoint.
/// </summary>
public record HostPollDto(
    Guid Id,
    Guid SessionId,
    string Question,
    string Status,
    DateTime CreatedAt,
    DateTime? ActivatedAt,
    DateTime? ClosedAt,
    List<PollOptionDto> Options,
    Guid? CorrectOptionId);

public record PollOptionResultDto(Guid OptionId, string Text, int VoteCount);

/// <summary>Vote tallies only — no correct-answer info. This is what's broadcast to the whole group on every new vote.</summary>
public record PollResultsDto(Guid PollId, int TotalVotes, List<PollOptionResultDto> Options);

/// <summary>
/// Returned only as the direct REST response to the participant who just
/// voted — never broadcast. IsCorrect is null for a plain poll with no
/// designated correct answer, true/false for a quiz-style poll.
/// </summary>
public record VoteResultDto(PollResultsDto Results, Guid SelectedOptionId, bool? IsCorrect, Guid? CorrectOptionId);
