using MediatR;
using Microsoft.AspNetCore.Mvc;
using PulseBoard.Application.Auth.Commands.Login;
using PulseBoard.Application.Auth.Commands.Register;

namespace PulseBoard.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly ISender _mediator;

    public AuthController(ISender mediator)
    {
        _mediator = mediator;
    }

    /// <summary>Create a new host account. Returns a JWT immediately (no separate login step needed after signup).</summary>
    [HttpPost("register")]
    public async Task<ActionResult<RegisterResult>> Register(RegisterCommand command)
    {
        var result = await _mediator.Send(command);
        return Ok(result);
    }

    /// <summary>Authenticate an existing host and return a JWT.</summary>
    [HttpPost("login")]
    public async Task<ActionResult<LoginResult>> Login(LoginCommand command)
    {
        var result = await _mediator.Send(command);
        return Ok(result);
    }
}
