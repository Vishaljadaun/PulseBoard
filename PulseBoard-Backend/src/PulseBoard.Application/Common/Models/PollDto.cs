namespace PulseBoard.Application.Common.Models;

public record PollOptionDto(Guid Id, string Text);

public record PollDto(
    Guid Id,
    Guid SessionId,
    string Question,
    string Status,
    DateTime CreatedAt,
    DateTime? ActivatedAt,
    DateTime? ClosedAt,
    List<PollOptionDto> Options);

public record PollOptionResultDto(Guid OptionId, string Text, int VoteCount);

public record PollResultsDto(Guid PollId, int TotalVotes, List<PollOptionResultDto> Options);
