using Microsoft.EntityFrameworkCore;

namespace PulseBoard.Infrastructure.Persistence;

// A distinct context type gives PostgreSQL its own migration history/model snapshot.
// Both contexts use the same entity mappings and application handlers.
public sealed class PostgresApplicationDbContext : ApplicationDbContext
{
    public PostgresApplicationDbContext(DbContextOptions<PostgresApplicationDbContext> options) : base(options) { }
}
