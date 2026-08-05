using MediatR;
using PulseBoard.Application.Common.Exceptions;
using PulseBoard.Application.Common.Interfaces;
using PulseBoard.Application.Common.Models;

namespace PulseBoard.Application.Sessions.Queries.GetHostSessions;

public record GetHostSessionsQuery : IRequest<List<SessionDto>>;

public class GetHostSessionsQueryHandler : IRequestHandler<GetHostSessionsQuery, List<SessionDto>>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public GetHostSessionsQueryHandler(IApplicationDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public Task<List<SessionDto>> Handle(GetHostSessionsQuery request, CancellationToken cancellationToken)
    {
        if (_currentUser.HostId is null)
            throw new UnauthorizedException("You must be logged in to view sessions.");

        var sessions = _db.Sessions
            .Where(s => s.HostId == _currentUser.HostId)
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new SessionDto(
                s.Id, s.Title, s.Topic, s.JoinCode,
                s.Status.ToString(), s.CreatedAt, s.StartedAt, s.EndedAt))
            .ToList();

        return Task.FromResult(sessions);
    }
}
