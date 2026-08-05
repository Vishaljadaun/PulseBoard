using FluentValidation;
using MediatR;
using PulseBoard.Application.Common.Exceptions;
using PulseBoard.Application.Common.Interfaces;

namespace PulseBoard.Application.Auth.Commands.Login;

public record LoginCommand(string Email, string Password) : IRequest<LoginResult>;

public record LoginResult(Guid HostId, string Name, string Email, string Token);

public class LoginCommandValidator : AbstractValidator<LoginCommand>
{
    public LoginCommandValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty();
    }
}

public class LoginCommandHandler : IRequestHandler<LoginCommand, LoginResult>
{
    private readonly IApplicationDbContext _db;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;

    public LoginCommandHandler(
        IApplicationDbContext db,
        IPasswordHasher passwordHasher,
        IJwtTokenGenerator jwtTokenGenerator)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _jwtTokenGenerator = jwtTokenGenerator;
    }

    public async Task<LoginResult> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var host = _db.Hosts.FirstOrDefault(h => h.Email == request.Email);

        if (host is null || !_passwordHasher.Verify(request.Password, host.PasswordHash))
            throw new UnauthorizedException("Invalid email or password.");

        var token = _jwtTokenGenerator.GenerateToken(host);

        return await Task.FromResult(new LoginResult(host.Id, host.Name, host.Email, token));
    }
}
