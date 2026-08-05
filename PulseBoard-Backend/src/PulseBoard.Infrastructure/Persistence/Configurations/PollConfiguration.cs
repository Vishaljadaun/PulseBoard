using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PulseBoard.Domain.Entities;

namespace PulseBoard.Infrastructure.Persistence.Configurations;

public class PollConfiguration : IEntityTypeConfiguration<Poll>
{
    public void Configure(EntityTypeBuilder<Poll> builder)
    {
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Question).IsRequired().HasMaxLength(300);
        builder.Property(p => p.Status).HasConversion<string>().HasMaxLength(20);

        builder.HasOne(p => p.Session)
            .WithMany()
            .HasForeignKey(p => p.SessionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(p => p.Options)
            .WithOne(o => o.Poll)
            .HasForeignKey(o => o.PollId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class PollOptionConfiguration : IEntityTypeConfiguration<PollOption>
{
    public void Configure(EntityTypeBuilder<PollOption> builder)
    {
        builder.HasKey(o => o.Id);
        builder.Property(o => o.Text).IsRequired().HasMaxLength(120);

        builder.HasMany(o => o.Votes)
            .WithOne(v => v.PollOption)
            .HasForeignKey(v => v.PollOptionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class VoteConfiguration : IEntityTypeConfiguration<Vote>
{
    public void Configure(EntityTypeBuilder<Vote> builder)
    {
        builder.HasKey(v => v.Id);

        // A participant can only vote once per poll option lookup is enforced
        // in the handler (needs to check across all options in a poll, not
        // just this option) — but we still guard the simple case at the DB
        // level: no duplicate (option, participant) pair.
        builder.HasIndex(v => new { v.PollOptionId, v.ParticipantId }).IsUnique();
    }
}
