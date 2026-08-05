using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PulseBoard.Domain.Entities;

namespace PulseBoard.Infrastructure.Persistence.Configurations;

public class HostConfiguration : IEntityTypeConfiguration<Host>
{
    public void Configure(EntityTypeBuilder<Host> builder)
    {
        builder.HasKey(h => h.Id);

        builder.Property(h => h.Name).IsRequired().HasMaxLength(100);
        builder.Property(h => h.Email).IsRequired().HasMaxLength(256);
        builder.Property(h => h.PasswordHash).IsRequired();

        builder.HasIndex(h => h.Email).IsUnique();

        builder.HasMany(h => h.Sessions)
            .WithOne(s => s.Host)
            .HasForeignKey(s => s.HostId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
