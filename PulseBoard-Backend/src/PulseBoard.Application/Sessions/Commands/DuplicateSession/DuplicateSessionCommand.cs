using MediatR;
using Microsoft.EntityFrameworkCore;
using PulseBoard.Application.Common.Exceptions;
using PulseBoard.Application.Common.Interfaces;
using PulseBoard.Application.Common.Models;
using PulseBoard.Application.Sessions.Commands.CreateSession;

namespace PulseBoard.Application.Sessions.Commands.DuplicateSession;

public record DuplicateSessionCommand(Guid SessionId) : IRequest<SessionDto>;

public class DuplicateSessionCommandHandler(
    IApplicationDbContext db, ICurrentUserService currentUser, IJoinCodeGenerator codes)
    : IRequestHandler<DuplicateSessionCommand, SessionDto>
{
    public async Task<SessionDto> Handle(DuplicateSessionCommand request, CancellationToken cancellationToken)
    {
        var source = await db.Sessions.AsNoTracking().FirstOrDefaultAsync(s => s.Id == request.SessionId, cancellationToken)
            ?? throw new NotFoundException("Session", request.SessionId);
        if (source.HostId != currentUser.HostId)
            throw new UnauthorizedException("You do not own this session.");

        var polls = await db.Polls.AsNoTracking().Where(p => p.SessionId == source.Id)
            .Include(p => p.Options).OrderBy(p => p.CreatedAt).ToListAsync(cancellationToken);
        var questions = polls.Select(p =>
        {
            var options = p.Options.ToList();
            var correct = options.FindIndex(o => o.IsCorrect);
            return new SessionQuestion(p.Question, options.Select(o => o.Text).ToList(), correct < 0 ? null : correct);
        }).ToList();
        var title = source.Title.Length > 143 ? source.Title[..143] : source.Title;
        // Reuse the validated, atomic create operation. No votes or lifecycle timestamps are copied.
        return await new CreateSessionCommandHandler(db, codes, currentUser).Handle(
            new CreateSessionCommand(title + " (copy)", source.Topic, questions), cancellationToken);
    }
}
