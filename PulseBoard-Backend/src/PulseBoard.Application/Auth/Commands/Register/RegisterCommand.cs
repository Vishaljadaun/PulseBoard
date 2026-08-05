using FluentValidation;
using MediatR;
using PulseBoard.Application.Common.Exceptions;
using PulseBoard.Application.Common.Interfaces;
using PulseBoard.Domain.Entities;

namespace PulseBoard.Application.Auth.Commands.Register;

public record RegisterCommand(string Name, string Email, string Password) : IRequest<RegisterResult>;

public record RegisterResult(Guid HostId, string Name, string Email, string Token);

public class RegisterCommandValidator : AbstractValidator<RegisterCommand>
{
    public RegisterCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(256);
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8)
            .WithMessage("Password must be at least 8 characters.");
    }
}

public class RegisterCommandHandler : IRequestHandler<RegisterCommand, RegisterResult>
{
    private readonly IApplicationDbContext _db;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;

    public RegisterCommandHandler(
        IApplicationDbContext db,
        IPasswordHasher passwordHasher,
        IJwtTokenGenerator jwtTokenGenerator)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _jwtTokenGenerator = jwtTokenGenerator;
    }

    public async Task<RegisterResult> Handle(RegisterCommand request, CancellationToken cancellationToken)
    {
        var emailTaken = _db.Hosts.Any(h => h.Email == request.Email);
        if (emailTaken)
            throw new BusinessRuleException($"An account with email '{request.Email}' already exists.");

        var host = new Host
        {
            Name = request.Name,
            Email = request.Email,
            PasswordHash = _passwordHasher.Hash(request.Password)
        };

        _db.Hosts.Add(host);
        await _db.SaveChangesAsync(cancellationToken);

        var token = _jwtTokenGenerator.GenerateToken(host);

        return new RegisterResult(host.Id, host.Name, host.Email, token);
    }
}
