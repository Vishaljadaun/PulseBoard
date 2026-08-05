using FluentValidation;
using MediatR;
using PulseBoard.Application.Common.Exceptions;
using PulseBoard.Application.Common.Interfaces;
using PulseBoard.Application.Common.Models;
using PulseBoard.Domain.Entities;
using PulseBoard.Domain.Enums;

namespace PulseBoard.Application.Polls.Commands.CastVote;

public record CastVoteCommand(Guid PollId, Guid OptionId, Guid ParticipantId) : IRequest<PollResultsDto>;

public class CastVoteCommandValidator : AbstractValidator<CastVoteCommand>
{
    public CastVoteCommandValidator()
    {
        RuleFor(x => x.PollId).NotEmpty();
        RuleFor(x => x.OptionId).NotEmpty();
        RuleFor(x => x.ParticipantId).NotEmpty();
    }
}

public class CastVoteCommandHandler : IRequestHandler<CastVoteCommand, PollResultsDto>
{
    private readonly IApplicationDbContext _db;
    private readonly ISessionHubNotifier _hubNotifier;

    public CastVoteCommandHandler(IApplicationDbContext db, ISessionHubNotifier hubNotifier)
    {
        _db = db;
        _hubNotifier = hubNotifier;
    }

    public async Task<PollResultsDto> Handle(CastVoteCommand request, CancellationToken cancellationToken)
    {
        var poll = _db.Polls.FirstOrDefault(p => p.Id == request.PollId)
            ?? throw new NotFoundException(nameof(Domain.Entities.Poll), request.PollId);

        if (poll.Status != PollStatus.Active)
            throw new BusinessRuleException("This poll is not currently active.");

        var option = _db.PollOptions.FirstOrDefault(o => o.Id == request.OptionId && o.PollId == poll.Id)
            ?? throw new NotFoundException(nameof(Domain.Entities.PollOption), request.OptionId);

        var alreadyVoted = _db.Votes.Any(v =>
            v.ParticipantId == request.ParticipantId &&
            v.PollOption!.PollId == poll.Id);

        if (alreadyVoted)
            throw new BusinessRuleException("You've already voted on this poll.");

        _db.Votes.Add(new Vote { PollOptionId = option.Id, ParticipantId = request.ParticipantId });
        await _db.SaveChangesAsync(cancellationToken);

        var results = BuildResults(poll.Id);
        await _hubNotifier.PollResultsUpdated(poll.SessionId, results);

        return results;
    }

    private PollResultsDto BuildResults(Guid pollId)
    {
        var options = _db.PollOptions
            .Where(o => o.PollId == pollId)
            .Select(o => new PollOptionResultDto(o.Id, o.Text, o.Votes.Count))
            .ToList();

        return new PollResultsDto(pollId, options.Sum(o => o.VoteCount), options);
    }
}
