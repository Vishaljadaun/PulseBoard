using MediatR;
using PulseBoard.Application.Common.Exceptions;
using PulseBoard.Application.Common.Interfaces;

namespace PulseBoard.Application.Sessions.Queries.GetSessionStatus;

// Public lifecycle snapshot; does not expose host details or the join code.
public record GetSessionStatusQuery(Guid SessionId) : IRequest<SessionStatusDto>;
public record SessionStatusDto(string Status);

public class GetSessionStatusQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetSessionStatusQuery, SessionStatusDto>
{
    public Task<SessionStatusDto> Handle(GetSessionStatusQuery request, CancellationToken cancellationToken)
    {
        var session = db.Sessions.FirstOrDefault(s => s.Id == request.SessionId)
            ?? throw new NotFoundException("Session", request.SessionId);
        return Task.FromResult(new SessionStatusDto(session.Status.ToString()));
    }
}
