using FluentValidation;
using MediatR;
using PulseBoard.Application.Common.Exceptions;
using PulseBoard.Application.Common.Interfaces;
using PulseBoard.Application.Common.Models;
using PulseBoard.Domain.Entities;

namespace PulseBoard.Application.Sessions.Commands.CreateSession;

public record CreateSessionCommand(string Title, string Topic) : IRequest<SessionDto>;

public class CreateSessionCommandValidator : AbstractValidator<CreateSessionCommand>
{
    public CreateSessionCommandValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Topic).NotEmpty().MaximumLength(500);
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

        var joinCode = await _joinCodeGenerator.GenerateUniqueCodeAsync(cancellationToken);

        var session = new Session
        {
            HostId = _currentUser.HostId.Value,
            Title = request.Title,
            Topic = request.Topic,
            JoinCode = joinCode
        };

        _db.Sessions.Add(session);
        await _db.SaveChangesAsync(cancellationToken);

        return new SessionDto(
            session.Id, session.Title, session.Topic, session.JoinCode,
            session.Status.ToString(), session.CreatedAt, session.StartedAt, session.EndedAt);
    }
}
