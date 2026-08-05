using FluentAssertions;
using PulseBoard.Domain.Entities;
using PulseBoard.Domain.Enums;
using Xunit;

namespace PulseBoard.Application.Tests.Polls;

public class PollStateTransitionTests
{
    [Fact]
    public void Activate_WhenDraft_MovesToActiveAndSetsActivatedAt()
    {
        var poll = new Poll { Status = PollStatus.Draft };

        poll.Activate();

        poll.Status.Should().Be(PollStatus.Active);
        poll.ActivatedAt.Should().NotBeNull();
    }

    [Fact]
    public void Activate_WhenAlreadyActive_ThrowsInvalidOperationException()
    {
        var poll = new Poll { Status = PollStatus.Active };

        var act = () => poll.Activate();

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*Only Draft polls can be activated*");
    }

    [Fact]
    public void Activate_WhenClosed_ThrowsInvalidOperationException()
    {
        var poll = new Poll { Status = PollStatus.Closed };

        var act = () => poll.Activate();

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void Close_WhenActive_MovesToClosedAndSetsClosedAt()
    {
        var poll = new Poll { Status = PollStatus.Active };

        poll.Close();

        poll.Status.Should().Be(PollStatus.Closed);
        poll.ClosedAt.Should().NotBeNull();
    }

    [Fact]
    public void Close_WhenDraft_ThrowsInvalidOperationException()
    {
        var poll = new Poll { Status = PollStatus.Draft };

        var act = () => poll.Close();

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*Only Active polls can be closed*");
    }
}
