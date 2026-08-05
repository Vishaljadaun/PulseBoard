using MediatR;
using PulseBoard.Application.Common.Exceptions;
using PulseBoard.Application.Common.Interfaces;
using PulseBoard.Application.Common.Models;

namespace PulseBoard.Application.Polls.Queries.GetPollResults;

public record GetPollResultsQuery(Guid PollId) : IRequest<PollResultsDto>;

public class GetPollResultsQueryHandler : IRequestHandler<GetPollResultsQuery, PollResultsDto>
{
    private readonly IApplicationDbContext _db;

    public GetPollResultsQueryHandler(IApplicationDbContext db)
    {
        _db = db;
    }

    public Task<PollResultsDto> Handle(GetPollResultsQuery request, CancellationToken cancellationToken)
    {
        var pollExists = _db.Polls.Any(p => p.Id == request.PollId);
        if (!pollExists)
            throw new NotFoundException(nameof(Domain.Entities.Poll), request.PollId);

        var options = _db.PollOptions
            .Where(o => o.PollId == request.PollId)
            .Select(o => new PollOptionResultDto(o.Id, o.Text, o.Votes.Count))
            .ToList();

        var results = new PollResultsDto(request.PollId, options.Sum(o => o.VoteCount), options);

        return Task.FromResult(results);
    }
}
