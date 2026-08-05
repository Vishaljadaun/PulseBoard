using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PulseBoard.Application.Sessions.Commands.CreateSession;
using PulseBoard.Application.Sessions.Commands.EndSession;
using PulseBoard.Application.Sessions.Commands.StartSession;
using PulseBoard.Application.Sessions.Queries.GetHostSessions;
using PulseBoard.Application.Sessions.Queries.GetSessionById;
using PulseBoard.Application.Sessions.Queries.GetSessionByJoinCode;

namespace PulseBoard.API.Controllers;

[ApiController]
[Route("api/sessions")]
public class SessionsController : ControllerBase
{
    private readonly ISender _mediator;

    public SessionsController(ISender mediator)
    {
        _mediator = mediator;
    }

    /// <summary>List all sessions belonging to the logged-in host — powers the dashboard.</summary>
    [Authorize]
    [HttpGet]
    public async Task<IActionResult> GetMySessions()
    {
        var result = await _mediator.Send(new GetHostSessionsQuery());
        return Ok(result);
    }

    /// <summary>Get one session's detail (must be owned by the logged-in host).</summary>
    [Authorize]
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _mediator.Send(new GetSessionByIdQuery(id));
        return Ok(result);
    }

    /// <summary>Create a new session (starts in Draft status) and generate its join code.</summary>
    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Create(CreateSessionCommand command)
    {
        var result = await _mediator.Send(command);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    /// <summary>Move a session from Draft to Live so participants can join and vote.</summary>
    [Authorize]
    [HttpPost("{id:guid}/start")]
    public async Task<IActionResult> Start(Guid id)
    {
        var result = await _mediator.Send(new StartSessionCommand(id));
        return Ok(result);
    }

    /// <summary>Move a session from Live to Ended.</summary>
    [Authorize]
    [HttpPost("{id:guid}/end")]
    public async Task<IActionResult> End(Guid id)
    {
        var result = await _mediator.Send(new EndSessionCommand(id));
        return Ok(result);
    }

    /// <summary>Public — a participant enters a join code on the /join page; no auth required.</summary>
    [AllowAnonymous]
    [HttpGet("join/{joinCode}")]
    public async Task<IActionResult> GetByJoinCode(string joinCode)
    {
        var result = await _mediator.Send(new GetSessionByJoinCodeQuery(joinCode));
        return Ok(result);
    }
}
