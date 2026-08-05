using FluentValidation;
using MediatR;
using PulseBoard.Application.Common.Exceptions;
using PulseBoard.Application.Common.Interfaces;
using PulseBoard.Application.Common.Models;
using PulseBoard.Domain.Entities;

namespace PulseBoard.Application.Polls.Commands.CreatePoll;

public record CreatePollCommand(Guid SessionId, string Question, List<string> Options) : IRequest<PollDto>;

public class CreatePollCommandValidator : AbstractValidator<CreatePollCommand>
{
    public CreatePollCommandValidator()
    {
        RuleFor(x => x.Question).NotEmpty().MaximumLength(300);
        RuleFor(x => x.Options)
            .Must(o => o.Count >= 2).WithMessage("A poll needs at least 2 options.")
            .Must(o => o.Count <= 8).WithMessage("A poll can have at most 8 options.");
        RuleForEach(x => x.Options).NotEmpty().MaximumLength(120);
    }
}

public class CreatePollCommandHandler : IRequestHandler<CreatePollCommand, PollDto>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public CreatePollCommandHandler(IApplicationDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<PollDto> Handle(CreatePollCommand request, CancellationToken cancellationToken)
    {
        var session = _db.Sessions.FirstOrDefault(s => s.Id == request.SessionId)
            ?? throw new NotFoundException(nameof(Domain.Entities.Session), request.SessionId);

        if (session.HostId != _currentUser.HostId)
            throw new UnauthorizedException("You do not own this session.");

        var poll = new Poll
        {
            SessionId = session.Id,
            Question = request.Question,
            Options = request.Options.Select(text => new PollOption { Text = text }).ToList()
        };

        _db.Polls.Add(poll);
        await _db.SaveChangesAsync(cancellationToken);

        return new PollDto(
            poll.Id, poll.SessionId, poll.Question, poll.Status.ToString(),
            poll.CreatedAt, poll.ActivatedAt, poll.ClosedAt,
            poll.Options.Select(o => new PollOptionDto(o.Id, o.Text)).ToList());
    }
}
