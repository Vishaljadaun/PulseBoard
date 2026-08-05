using PulseBoard.Domain.Common;

namespace PulseBoard.Domain.Entities;

/// <summary>
/// A registered user who creates and runs live sessions.
/// Participants are NOT hosts — they never create an account, they just
/// join with a code (see Session.JoinCode), so there's no Participant entity yet.
/// </summary>
public class Host : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;

    // Navigation
    public ICollection<Session> Sessions { get; set; } = new List<Session>();
}
