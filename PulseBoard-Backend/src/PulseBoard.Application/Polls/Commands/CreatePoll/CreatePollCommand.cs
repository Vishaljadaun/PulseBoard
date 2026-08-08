using FluentValidation;
using MediatR;
using PulseBoard.Application.Common.Exceptions;
using PulseBoard.Application.Common.Interfaces;
using PulseBoard.Application.Common.Models;
using PulseBoard.Domain.Entities;

namespace PulseBoard.Application.Polls.Commands.CreatePoll;

/// <summary>
/// CorrectOptionIndex is optional (0-based index into Options). Leave it
/// null for a plain opinion poll with no right answer — set it for a
/// quiz-style poll where a participant should learn whether they got it
/// right after voting.
/// </summary>
public record CreatePollCommand(Guid SessionId, string Question, List<string> Options, int? CorrectOptionIndex)
    : IRequest<HostPollDto>;

public class CreatePollCommandValidator : AbstractValidator<CreatePollCommand>
{
    public CreatePollCommandValidator()
    {
        RuleFor(x => x.Question).NotEmpty().MaximumLength(300);
        RuleFor(x => x.Options)
            .Must(o => o.Count >= 2).WithMessage("A poll needs at least 2 options.")
            .Must(o => o.Count <= 8).WithMessage("A poll can have at most 8 options.");
        RuleForEach(x => x.Options).NotEmpty().MaximumLength(120);

        RuleFor(x => x.CorrectOptionIndex)
            .Must((command, index) => index is null || (index >= 0 && index < command.Options.Count))
            .WithMessage("CorrectOptionIndex must be a valid index into Options.");
    }
}

public class CreatePollCommandHandler : IRequestHandler<CreatePollCommand, HostPollDto>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public CreatePollCommandHandler(IApplicationDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<HostPollDto> Handle(CreatePollCommand request, CancellationToken cancellationToken)
    {
        var session = _db.Sessions.FirstOrDefault(s => s.Id == request.SessionId)
            ?? throw new NotFoundException(nameof(Domain.Entities.Session), request.SessionId);

        if (session.HostId != _currentUser.HostId)
            throw new UnauthorizedException("You do not own this session.");

        var poll = new Poll
        {
            SessionId = session.Id,
            Question = request.Question,
            Options = request.Options
                .Select((text, index) => new PollOption
                {
                    Text = text,
                    IsCorrect = request.CorrectOptionIndex.HasValue && index == request.CorrectOptionIndex.Value
                })
                .ToList()
        };

        _db.Polls.Add(poll);
        await _db.SaveChangesAsync(cancellationToken);

        var correctOption = poll.Options.FirstOrDefault(o => o.IsCorrect);

        return new HostPollDto(
            poll.Id, poll.SessionId, poll.Question, poll.Status.ToString(),
            poll.CreatedAt, poll.ActivatedAt, poll.ClosedAt,
            poll.Options.Select(o => new PollOptionDto(o.Id, o.Text)).ToList(),
            correctOption?.Id);
    }
}
