namespace PulseBoard.Application.Common.Models;

/// <summary>
/// What the AI proposes for a poll — deliberately NOT a Poll entity, since
/// this is just a suggestion the host reviews/edits in the UI before it
/// ever gets saved via the normal CreatePoll command. No DB write happens
/// as part of generating this.
/// </summary>
public record PollSuggestionDto(string Question, List<string> Options, int CorrectOptionIndex);
