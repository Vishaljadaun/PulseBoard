using MediatR;
using PulseBoard.Application.Common.Exceptions;
using PulseBoard.Application.Common.Interfaces;
using PulseBoard.Domain.Enums;

namespace PulseBoard.Application.Sessions.Queries.GetSessionByJoinCode;

/// <summary>
/// Public (no auth) — a participant enters a join code and we tell them
/// whether it's a real, currently-live session before letting them in.
/// </summary>
public record GetSessionByJoinCodeQuery(string JoinCode) : IRequest<JoinCodeResult>;

public record JoinCodeResult(Guid SessionId, string Title, string Status);

public class GetSessionByJoinCodeQueryHandler : IRequestHandler<GetSessionByJoinCodeQuery, JoinCodeResult>
{
    private readonly IApplicationDbContext _db;

    public GetSessionByJoinCodeQueryHandler(IApplicationDbContext db)
    {
        _db = db;
    }

    public Task<JoinCodeResult> Handle(GetSessionByJoinCodeQuery request, CancellationToken cancellationToken)
    {
        var session = _db.Sessions.FirstOrDefault(s => s.JoinCode == request.JoinCode)
            ?? throw new NotFoundException("Session with join code", request.JoinCode);

        if (session.Status != SessionStatus.Live)
            throw new BusinessRuleException("This session is not currently live.");

        return Task.FromResult(new JoinCodeResult(session.Id, session.Title, session.Status.ToString()));
    }
}
