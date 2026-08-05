using Microsoft.EntityFrameworkCore;
using PulseBoard.Domain.Entities;

namespace PulseBoard.Application.Common.Interfaces;

/// <summary>
/// Abstraction over the EF Core DbContext. The Application layer depends on
/// this interface, never on Infrastructure directly — that's what keeps
/// Clean Architecture's dependency rule intact (Application knows nothing
/// about EF Core, SQL Server, etc.).
/// </summary>
public interface IApplicationDbContext
{
    DbSet<Host> Hosts { get; }
    DbSet<Session> Sessions { get; }
    DbSet<Poll> Polls { get; }
    DbSet<PollOption> PollOptions { get; }
    DbSet<Vote> Votes { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
