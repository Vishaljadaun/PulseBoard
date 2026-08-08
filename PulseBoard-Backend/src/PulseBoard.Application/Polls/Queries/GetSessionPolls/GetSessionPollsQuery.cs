using MediatR;
using PulseBoard.Application.Common.Exceptions;
using PulseBoard.Application.Common.Interfaces;
using PulseBoard.Application.Common.Models;

namespace PulseBoard.Application.Polls.Queries.GetSessionPolls;

/// <summary>Host-only — includes each poll's correct-answer marker (see HostPollDto). Never exposed publicly.</summary>
public record GetSessionPollsQuery(Guid SessionId) : IRequest<List<HostPollDto>>;

public class GetSessionPollsQueryHandler : IRequestHandler<GetSessionPollsQuery, List<HostPollDto>>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public GetSessionPollsQueryHandler(IApplicationDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public Task<List<HostPollDto>> Handle(GetSessionPollsQuery request, CancellationToken cancellationToken)
    {
        var session = _db.Sessions.FirstOrDefault(s => s.Id == request.SessionId)
            ?? throw new NotFoundException(nameof(Domain.Entities.Session), request.SessionId);

        if (session.HostId != _currentUser.HostId)
            throw new UnauthorizedException("You do not own this session.");

        var polls = _db.Polls
            .Where(p => p.SessionId == request.SessionId)
            .OrderBy(p => p.CreatedAt)
            .Select(p => new HostPollDto(
                p.Id, p.SessionId, p.Question, p.Status.ToString(),
                p.CreatedAt, p.ActivatedAt, p.ClosedAt,
                p.Options.Select(o => new PollOptionDto(o.Id, o.Text)).ToList(),
                p.Options.Where(o => o.IsCorrect).Select(o => (Guid?)o.Id).FirstOrDefault()))
            .ToList();

        return Task.FromResult(polls);
    }
}
