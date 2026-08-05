using MediatR;
using PulseBoard.Application.Common.Exceptions;
using PulseBoard.Application.Common.Interfaces;
using PulseBoard.Application.Common.Models;

namespace PulseBoard.Application.Polls.Queries.GetSessionPolls;

public record GetSessionPollsQuery(Guid SessionId) : IRequest<List<PollDto>>;

public class GetSessionPollsQueryHandler : IRequestHandler<GetSessionPollsQuery, List<PollDto>>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public GetSessionPollsQueryHandler(IApplicationDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public Task<List<PollDto>> Handle(GetSessionPollsQuery request, CancellationToken cancellationToken)
    {
        var session = _db.Sessions.FirstOrDefault(s => s.Id == request.SessionId)
            ?? throw new NotFoundException(nameof(Domain.Entities.Session), request.SessionId);

        if (session.HostId != _currentUser.HostId)
            throw new UnauthorizedException("You do not own this session.");

        var polls = _db.Polls
            .Where(p => p.SessionId == request.SessionId)
            .OrderBy(p => p.CreatedAt)
            .Select(p => new PollDto(
                p.Id, p.SessionId, p.Question, p.Status.ToString(),
                p.CreatedAt, p.ActivatedAt, p.ClosedAt,
                p.Options.Select(o => new PollOptionDto(o.Id, o.Text)).ToList()))
            .ToList();

        return Task.FromResult(polls);
    }
}
