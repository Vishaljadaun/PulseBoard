using System.IdentityModel.Tokens.Jwt;
using PulseBoard.Application.Common.Interfaces;

namespace PulseBoard.API.Services;

public class CurrentUserService : ICurrentUserService
{
    public Guid? HostId { get; }

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        var sub = httpContextAccessor.HttpContext?.User
            .FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        HostId = Guid.TryParse(sub, out var id) ? id : null;
    }
}
