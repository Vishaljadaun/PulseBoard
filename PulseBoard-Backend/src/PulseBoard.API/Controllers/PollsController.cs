using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PulseBoard.Application.Polls.Commands.ActivatePoll;
using PulseBoard.Application.Polls.Commands.CastVote;
using PulseBoard.Application.Polls.Commands.ClosePoll;
using PulseBoard.Application.Polls.Commands.CreatePoll;
using PulseBoard.Application.Polls.Commands.GeneratePollSuggestion;
using PulseBoard.Application.Polls.Queries.GetActivePoll;
using PulseBoard.Application.Polls.Queries.GetPollResults;
using PulseBoard.Application.Polls.Queries.GetSessionPolls;

namespace PulseBoard.API.Controllers;

[ApiController]
[Route("api")]
public class PollsController : ControllerBase
{
    private readonly ISender _mediator;

    public PollsController(ISender mediator)
    {
        _mediator = mediator;
    }

    /// <summary>Host — list all polls in a session.</summary>
    [Authorize]
    [HttpGet("sessions/{sessionId:guid}/polls")]
    public async Task<IActionResult> GetSessionPolls(Guid sessionId)
    {
        var result = await _mediator.Send(new GetSessionPollsQuery(sessionId));
        return Ok(result);
    }

    /// <summary>Host — create a new poll (starts in Draft) under a session.</summary>
    [Authorize]
    [HttpPost("sessions/{sessionId:guid}/polls")]
    public async Task<IActionResult> Create(Guid sessionId, CreatePollRequestBody body)
    {
        var result = await _mediator.Send(new CreatePollCommand(sessionId, body.Question, body.Options));
        return CreatedAtAction(nameof(GetSessionPolls), new { sessionId }, result);
    }

    /// <summary>Host — AI drafts a question + options from a topic. Nothing is saved; the host reviews/edits and then calls Create.</summary>
    [Authorize]
    [HttpPost("sessions/{sessionId:guid}/polls/generate")]
    public async Task<IActionResult> GenerateSuggestion(Guid sessionId, GeneratePollSuggestionRequestBody body)
    {
        var result = await _mediator.Send(new GeneratePollSuggestionCommand(sessionId, body.Topic));
        return Ok(result);
    }

    /// <summary>Host — Draft -> Active. Broadcasts to everyone in the session via SignalR.</summary>
    [Authorize]
    [HttpPost("polls/{pollId:guid}/activate")]
    public async Task<IActionResult> Activate(Guid pollId)
    {
        var result = await _mediator.Send(new ActivatePollCommand(pollId));
        return Ok(result);
    }

    /// <summary>Host — Active -> Closed. Broadcasts to everyone in the session via SignalR.</summary>
    [Authorize]
    [HttpPost("polls/{pollId:guid}/close")]
    public async Task<IActionResult> Close(Guid pollId)
    {
        await _mediator.Send(new ClosePollCommand(pollId));
        return NoContent();
    }

    /// <summary>Public — participant fetches whatever poll is currently active in a session (fallback if they missed the SignalR push, e.g. joined mid-poll).</summary>
    [AllowAnonymous]
    [HttpGet("sessions/{sessionId:guid}/polls/active")]
    public async Task<IActionResult> GetActive(Guid sessionId)
    {
        var result = await _mediator.Send(new GetActivePollQuery(sessionId));
        return result is null ? NoContent() : Ok(result);
    }

    /// <summary>Public — current vote tallies for a poll.</summary>
    [AllowAnonymous]
    [HttpGet("polls/{pollId:guid}/results")]
    public async Task<IActionResult> GetResults(Guid pollId)
    {
        var result = await _mediator.Send(new GetPollResultsQuery(pollId));
        return Ok(result);
    }

    /// <summary>Public — participant casts a vote. Broadcasts updated results via SignalR.</summary>
    [AllowAnonymous]
    [HttpPost("polls/{pollId:guid}/vote")]
    public async Task<IActionResult> Vote(Guid pollId, CastVoteRequestBody body)
    {
        var result = await _mediator.Send(new CastVoteCommand(pollId, body.OptionId, body.ParticipantId));
        return Ok(result);
    }
}

public record CreatePollRequestBody(string Question, List<string> Options);
public record CastVoteRequestBody(Guid OptionId, Guid ParticipantId);
public record GeneratePollSuggestionRequestBody(string Topic);
