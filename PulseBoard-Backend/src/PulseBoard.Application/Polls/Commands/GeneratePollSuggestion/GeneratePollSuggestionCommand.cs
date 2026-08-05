using FluentValidation;
using MediatR;
using PulseBoard.Application.Common.Exceptions;
using PulseBoard.Application.Common.Interfaces;
using PulseBoard.Application.Common.Models;

namespace PulseBoard.Application.Polls.Commands.GeneratePollSuggestion;

public record GeneratePollSuggestionCommand(Guid SessionId, string Topic) : IRequest<PollSuggestionDto>;

public class GeneratePollSuggestionCommandValidator : AbstractValidator<GeneratePollSuggestionCommand>
{
    public GeneratePollSuggestionCommandValidator()
    {
        RuleFor(x => x.Topic).NotEmpty().MaximumLength(200);
    }
}

public class GeneratePollSuggestionCommandHandler : IRequestHandler<GeneratePollSuggestionCommand, PollSuggestionDto>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IPollAiGenerator _aiGenerator;

    public GeneratePollSuggestionCommandHandler(
        IApplicationDbContext db,
        ICurrentUserService currentUser,
        IPollAiGenerator aiGenerator)
    {
        _db = db;
        _currentUser = currentUser;
        _aiGenerator = aiGenerator;
    }

    public async Task<PollSuggestionDto> Handle(GeneratePollSuggestionCommand request, CancellationToken cancellationToken)
    {
        var session = _db.Sessions.FirstOrDefault(s => s.Id == request.SessionId)
            ?? throw new NotFoundException(nameof(Domain.Entities.Session), request.SessionId);

        if (session.HostId != _currentUser.HostId)
            throw new UnauthorizedException("You do not own this session.");

        return await _aiGenerator.GenerateAsync(request.Topic, cancellationToken);
    }
}
