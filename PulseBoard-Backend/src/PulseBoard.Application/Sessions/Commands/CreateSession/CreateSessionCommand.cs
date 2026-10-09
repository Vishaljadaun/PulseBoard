using FluentValidation;
using MediatR;
using PulseBoard.Application.Common.Exceptions;
using PulseBoard.Application.Common.Interfaces;
using PulseBoard.Application.Common.Models;
using PulseBoard.Domain.Entities;

namespace PulseBoard.Application.Sessions.Commands.CreateSession;

public record SessionQuestion(string Question, List<string> Options, int? CorrectOptionIndex);
public record CreateSessionCommand(string Title, string Topic, List<SessionQuestion>? Questions = null) : IRequest<SessionDto>;

public class SessionQuestionValidator : AbstractValidator<SessionQuestion>
{
    public SessionQuestionValidator()
    {
        RuleFor(x => x.Question).NotEmpty().MaximumLength(300);
        RuleFor(x => x.Options).NotNull().Must(x => x is not null && x.Count >= 2 && x.Count <= 8)
            .WithMessage("Each question needs 2 to 8 options.");
        RuleForEach(x => x.Options).NotEmpty().MaximumLength(120);
        RuleFor(x => x.CorrectOptionIndex).Must((q, i) => i is null ||
            (q.Options is not null && i >= 0 && i < q.Options.Count))
            .WithMessage("The correct answer must match an option.");
    }
}

public class CreateSessionCommandValidator : AbstractValidator<CreateSessionCommand>
{
    public CreateSessionCommandValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Topic).NotEmpty().MaximumLength(500);
        RuleFor(x => x.Questions).Must(q => q is null || q.Count <= 50)
            .WithMessage("A starter can contain up to 50 questions.");
        RuleForEach(x => x.Questions).NotNull().SetValidator(new SessionQuestionValidator());
    }
}

public class CreateSessionCommandHandler : IRequestHandler<CreateSessionCommand, SessionDto>
{
    private readonly IApplicationDbContext _db;
    private readonly IJoinCodeGenerator _joinCodeGenerator;
    private readonly ICurrentUserService _currentUser;

    public CreateSessionCommandHandler(
        IApplicationDbContext db,
        IJoinCodeGenerator joinCodeGenerator,
        ICurrentUserService currentUser)
    {
        _db = db;
        _joinCodeGenerator = joinCodeGenerator;
        _currentUser = currentUser;
    }

    public async Task<SessionDto> Handle(CreateSessionCommand request, CancellationToken cancellationToken)
    {
        if (_currentUser.HostId is null)
            throw new UnauthorizedException("You must be logged in to create a session.");

        await new CreateSessionCommandValidator().ValidateAndThrowAsync(request, cancellationToken);

        var joinCode = await _joinCodeGenerator.GenerateUniqueCodeAsync(cancellationToken);

        var session = new Session
        {
            HostId = _currentUser.HostId.Value,
            Title = request.Title.Trim(),
            Topic = request.Topic.Trim(),
            JoinCode = joinCode
        };

        _db.Sessions.Add(session);
        // One save keeps a starter atomic: a failed question never leaves a partial session.
        foreach (var question in request.Questions ?? new List<SessionQuestion>())
            _db.Polls.Add(new Poll
            {
                Session = session,
                SessionId = session.Id,
                Question = question.Question.Trim(),
                Options = question.Options.Select((text, index) => new PollOption
                {
                    Text = text.Trim(), IsCorrect = index == question.CorrectOptionIndex
                }).ToList()
            });
        await _db.SaveChangesAsync(cancellationToken);

        return new SessionDto(
            session.Id, session.Title, session.Topic, session.JoinCode,
            session.Status.ToString(), session.CreatedAt, session.StartedAt, session.EndedAt);
    }
}
