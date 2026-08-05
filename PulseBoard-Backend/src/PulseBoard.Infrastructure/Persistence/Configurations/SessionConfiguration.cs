using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PulseBoard.Domain.Entities;

namespace PulseBoard.Infrastructure.Persistence.Configurations;

public class SessionConfiguration : IEntityTypeConfiguration<Session>
{
    public void Configure(EntityTypeBuilder<Session> builder)
    {
        builder.HasKey(s => s.Id);

        builder.Property(s => s.Title).IsRequired().HasMaxLength(150);
        builder.Property(s => s.Topic).IsRequired().HasMaxLength(500);
        builder.Property(s => s.JoinCode).IsRequired().HasMaxLength(6);
        builder.Property(s => s.Status).HasConversion<string>().HasMaxLength(20);

        builder.HasIndex(s => s.JoinCode).IsUnique();
    }
}
