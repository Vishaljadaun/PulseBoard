using MediatR;
using Microsoft.EntityFrameworkCore;
using PulseBoard.Application.Common.Exceptions;
using PulseBoard.Application.Common.Interfaces;
using PulseBoard.Application.Common.Models;

namespace PulseBoard.Application.Sessions.Queries.GetSessionReport;

public record ReportOption(Guid Id, string Text, bool IsCorrect, int Responses);
public record ReportQuestion(Guid Id, string Question, string Status, int Responses,
    int? CorrectResponses, double? Accuracy, List<ReportOption> Options);
public record SessionReportDto(SessionDto Session, DateTime GeneratedAt, int Respondents,
    int TotalResponses, int QuizResponses, double? Accuracy, List<ReportQuestion> Questions);
public record GetSessionReportQuery(Guid SessionId) : IRequest<SessionReportDto>;

public class GetSessionReportQueryHandler(IApplicationDbContext db, ICurrentUserService currentUser)
    : IRequestHandler<GetSessionReportQuery, SessionReportDto>
{
    public async Task<SessionReportDto> Handle(GetSessionReportQuery request, CancellationToken cancellationToken)
    {
        var session = await db.Sessions.AsNoTracking().FirstOrDefaultAsync(s => s.Id == request.SessionId, cancellationToken)
            ?? throw new NotFoundException("Session", request.SessionId);
        if (session.HostId != currentUser.HostId)
            throw new UnauthorizedException("You do not own this session.");

        var polls = await db.Polls.AsNoTracking().Where(p => p.SessionId == session.Id)
            .OrderBy(p => p.CreatedAt).Select(p => new
            {
                p.Id, p.Question, p.Status,
                Options = p.Options.Select(o => new ReportOption(o.Id, o.Text, o.IsCorrect, o.Votes.Count)).ToList()
            }).ToListAsync(cancellationToken);
        var respondents = await db.Votes.Where(v => v.PollOption!.Poll!.SessionId == session.Id)
            .Select(v => v.ParticipantId).Distinct().CountAsync(cancellationToken);
        var questions = polls.Select(p =>
        {
            var responses = p.Options.Sum(o => o.Responses);
            int? correct = p.Options.Any(o => o.IsCorrect) ? p.Options.Where(o => o.IsCorrect).Sum(o => o.Responses) : null;
            return new ReportQuestion(p.Id, p.Question, p.Status.ToString(), responses, correct,
                correct.HasValue && responses > 0 ? Math.Round(100d * correct.Value / responses, 1) : null, p.Options);
        }).ToList();
        var quizResponses = questions.Where(q => q.CorrectResponses.HasValue).Sum(q => q.Responses);
        return new SessionReportDto(
            new SessionDto(session.Id, session.Title, session.Topic, session.JoinCode, session.Status.ToString(),
                session.CreatedAt, session.StartedAt, session.EndedAt), DateTime.UtcNow, respondents,
            questions.Sum(q => q.Responses), quizResponses,
            quizResponses > 0 ? Math.Round(100d * questions.Sum(q => q.CorrectResponses ?? 0) / quizResponses, 1) : null,
            questions);
    }
}
