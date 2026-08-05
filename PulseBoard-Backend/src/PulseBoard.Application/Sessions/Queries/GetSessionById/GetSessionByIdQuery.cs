using MediatR;
using PulseBoard.Application.Common.Exceptions;
using PulseBoard.Application.Common.Interfaces;
using PulseBoard.Application.Common.Models;

namespace PulseBoard.Application.Sessions.Queries.GetSessionById;

public record GetSessionByIdQuery(Guid SessionId) : IRequest<SessionDto>;

public class GetSessionByIdQueryHandler : IRequestHandler<GetSessionByIdQuery, SessionDto>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public GetSessionByIdQueryHandler(IApplicationDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public Task<SessionDto> Handle(GetSessionByIdQuery request, CancellationToken cancellationToken)
    {
        var session = _db.Sessions.FirstOrDefault(s => s.Id == request.SessionId)
            ?? throw new NotFoundException(nameof(Domain.Entities.Session), request.SessionId);

        if (session.HostId != _currentUser.HostId)
            throw new UnauthorizedException("You do not own this session.");

        return Task.FromResult(new SessionDto(
            session.Id, session.Title, session.Topic, session.JoinCode,
            session.Status.ToString(), session.CreatedAt, session.StartedAt, session.EndedAt));
    }
}
