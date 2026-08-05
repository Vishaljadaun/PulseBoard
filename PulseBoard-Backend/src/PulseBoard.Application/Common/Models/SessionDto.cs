namespace PulseBoard.Application.Common.Models;

public record SessionDto(
    Guid Id,
    string Title,
    string Topic,
    string JoinCode,
    string Status,
    DateTime CreatedAt,
    DateTime? StartedAt,
    DateTime? EndedAt);
