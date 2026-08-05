using MediatR;
using PulseBoard.Application.Common.Exceptions;
using PulseBoard.Application.Common.Interfaces;
using PulseBoard.Application.Common.Models;
using PulseBoard.Domain.Enums;

namespace PulseBoard.Application.Polls.Commands.ActivatePoll;

public record ActivatePollCommand(Guid PollId) : IRequest<PollDto>;

public class ActivatePollCommandHandler : IRequestHandler<ActivatePollCommand, PollDto>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly ISessionHubNotifier _hubNotifier;

    public ActivatePollCommandHandler(
        IApplicationDbContext db,
        ICurrentUserService currentUser,
        ISessionHubNotifier hubNotifier)
    {
        _db = db;
        _currentUser = currentUser;
        _hubNotifier = hubNotifier;
    }

    public async Task<PollDto> Handle(ActivatePollCommand request, CancellationToken cancellationToken)
    {
        var poll = _db.Polls.FirstOrDefault(p => p.Id == request.PollId)
            ?? throw new NotFoundException(nameof(Domain.Entities.Poll), request.PollId);

        var session = _db.Sessions.FirstOrDefault(s => s.Id == poll.SessionId)
            ?? throw new NotFoundException(nameof(Domain.Entities.Session), poll.SessionId);

        if (session.HostId != _currentUser.HostId)
            throw new UnauthorizedException("You do not own this session.");

        // Only one poll can be active per session — close-out rule spans
        // multiple polls, so it lives here rather than on the Poll entity.
        var alreadyActive = _db.Polls.Any(p => p.SessionId == poll.SessionId && p.Status == PollStatus.Active);
        if (alreadyActive)
            throw new BusinessRuleException("Another poll is already active in this session. Close it first.");

        poll.Activate();
        await _db.SaveChangesAsync(cancellationToken);

        var options = _db.PollOptions.Where(o => o.PollId == poll.Id)
            .Select(o => new PollOptionDto(o.Id, o.Text)).ToList();

        var dto = new PollDto(
            poll.Id, poll.SessionId, poll.Question, poll.Status.ToString(),
            poll.CreatedAt, poll.ActivatedAt, poll.ClosedAt, options);

        await _hubNotifier.PollActivated(poll.SessionId, dto);

        return dto;
    }
}
