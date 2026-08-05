using MediatR;
using PulseBoard.Application.Common.Exceptions;
using PulseBoard.Application.Common.Interfaces;
using PulseBoard.Application.Common.Models;

namespace PulseBoard.Application.Sessions.Commands.EndSession;

public record EndSessionCommand(Guid SessionId) : IRequest<SessionDto>;

public class EndSessionCommandHandler : IRequestHandler<EndSessionCommand, SessionDto>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public EndSessionCommandHandler(IApplicationDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<SessionDto> Handle(EndSessionCommand request, CancellationToken cancellationToken)
    {
        var session = _db.Sessions.FirstOrDefault(s => s.Id == request.SessionId)
            ?? throw new NotFoundException(nameof(Domain.Entities.Session), request.SessionId);

        if (session.HostId != _currentUser.HostId)
            throw new UnauthorizedException("You do not own this session.");

        session.End(); // domain method enforces Live -> Ended rule

        await _db.SaveChangesAsync(cancellationToken);

        return new SessionDto(
            session.Id, session.Title, session.Topic, session.JoinCode,
            session.Status.ToString(), session.CreatedAt, session.StartedAt, session.EndedAt);
    }
}
