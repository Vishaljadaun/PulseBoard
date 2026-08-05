using MediatR;
using PulseBoard.Application.Common.Interfaces;
using PulseBoard.Application.Common.Models;
using PulseBoard.Domain.Enums;

namespace PulseBoard.Application.Polls.Queries.GetActivePoll;

/// <summary>Public — participants poll this (or receive it via SignalR) to know what's currently active.</summary>
public record GetActivePollQuery(Guid SessionId) : IRequest<PollDto?>;

public class GetActivePollQueryHandler : IRequestHandler<GetActivePollQuery, PollDto?>
{
    private readonly IApplicationDbContext _db;

    public GetActivePollQueryHandler(IApplicationDbContext db)
    {
        _db = db;
    }

    public Task<PollDto?> Handle(GetActivePollQuery request, CancellationToken cancellationToken)
    {
        var poll = _db.Polls
            .Where(p => p.SessionId == request.SessionId && p.Status == PollStatus.Active)
            .Select(p => new PollDto(
                p.Id, p.SessionId, p.Question, p.Status.ToString(),
                p.CreatedAt, p.ActivatedAt, p.ClosedAt,
                p.Options.Select(o => new PollOptionDto(o.Id, o.Text)).ToList()))
            .FirstOrDefault();

        return Task.FromResult(poll);
    }
}
