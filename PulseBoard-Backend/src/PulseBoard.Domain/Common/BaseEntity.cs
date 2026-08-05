namespace PulseBoard.Domain.Common;

/// <summary>
/// Base class for all domain entities. Every entity gets a GUID primary key
/// and a CreatedAt timestamp for free.
/// </summary>
public abstract class BaseEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
