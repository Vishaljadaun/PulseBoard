using PulseBoard.Application.Common.Models;

namespace PulseBoard.Application.Common.Interfaces;

/// <summary>
/// Implemented in Infrastructure against a real AI provider (see
/// GroqPollAiGenerator). Kept as an interface here so Application never
/// references an HTTP client, an API key, or any provider-specific SDK —
/// swapping providers later only touches Infrastructure.
/// </summary>
public interface IPollAiGenerator
{
    Task<PollSuggestionDto> GenerateAsync(string topic, CancellationToken cancellationToken);
}
