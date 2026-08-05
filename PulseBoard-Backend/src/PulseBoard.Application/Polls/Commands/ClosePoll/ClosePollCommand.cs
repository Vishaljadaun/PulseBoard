using MediatR;
using PulseBoard.Application.Common.Exceptions;
using PulseBoard.Application.Common.Interfaces;

namespace PulseBoard.Application.Polls.Commands.ClosePoll;

public record ClosePollCommand(Guid PollId) : IRequest;

public class ClosePollCommandHandler : IRequestHandler<ClosePollCommand>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly ISessionHubNotifier _hubNotifier;

    public ClosePollCommandHandler(
        IApplicationDbContext db,
        ICurrentUserService currentUser,
        ISessionHubNotifier hubNotifier)
    {
        _db = db;
        _currentUser = currentUser;
        _hubNotifier = hubNotifier;
    }

    public async Task Handle(ClosePollCommand request, CancellationToken cancellationToken)
    {
        var poll = _db.Polls.FirstOrDefault(p => p.Id == request.PollId)
            ?? throw new NotFoundException(nameof(Domain.Entities.Poll), request.PollId);

        var session = _db.Sessions.FirstOrDefault(s => s.Id == poll.SessionId)
            ?? throw new NotFoundException(nameof(Domain.Entities.Session), poll.SessionId);

        if (session.HostId != _currentUser.HostId)
            throw new UnauthorizedException("You do not own this session.");

        poll.Close();
        await _db.SaveChangesAsync(cancellationToken);

        await _hubNotifier.PollClosed(poll.SessionId, poll.Id);
    }
}
