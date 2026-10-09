using MediatR;
using PulseBoard.Application.Common.Exceptions;
using PulseBoard.Application.Common.Interfaces;
using PulseBoard.Application.Common.Models;
using PulseBoard.Domain.Enums;

namespace PulseBoard.Application.Sessions.Commands.EndSession;

public record EndSessionCommand(Guid SessionId) : IRequest<SessionDto>;

public class EndSessionCommandHandler : IRequestHandler<EndSessionCommand, SessionDto>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly ISessionHubNotifier _hubNotifier;

    public EndSessionCommandHandler(IApplicationDbContext db, ICurrentUserService currentUser,
        ISessionHubNotifier hubNotifier)
    {
        _db = db;
        _currentUser = currentUser;
        _hubNotifier = hubNotifier;
    }

    public async Task<SessionDto> Handle(EndSessionCommand request, CancellationToken cancellationToken)
    {
        var session = _db.Sessions.FirstOrDefault(s => s.Id == request.SessionId)
            ?? throw new NotFoundException(nameof(Domain.Entities.Session), request.SessionId);

        if (session.HostId != _currentUser.HostId)
            throw new UnauthorizedException("You do not own this session.");

        session.End(); // domain method enforces Live -> Ended rule

        var activePolls = _db.Polls
            .Where(p => p.SessionId == session.Id && p.Status == PollStatus.Active).ToList();
        foreach (var poll in activePolls)
            poll.Close();

        await _db.SaveChangesAsync(cancellationToken);

        await _hubNotifier.SessionEnded(session.Id);

        return new SessionDto(
            session.Id, session.Title, session.Topic, session.JoinCode,
            session.Status.ToString(), session.CreatedAt, session.StartedAt, session.EndedAt);
    }
}
