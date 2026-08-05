using FluentAssertions;
using PulseBoard.Domain.Entities;
using PulseBoard.Domain.Enums;
using Xunit;

namespace PulseBoard.Application.Tests.Sessions;

public class SessionStateTransitionTests
{
    [Fact]
    public void Start_WhenDraft_MovesToLiveAndSetsStartedAt()
    {
        var session = new Session { Status = SessionStatus.Draft };

        session.Start();

        session.Status.Should().Be(SessionStatus.Live);
        session.StartedAt.Should().NotBeNull();
    }

    [Fact]
    public void Start_WhenAlreadyLive_ThrowsInvalidOperationException()
    {
        var session = new Session { Status = SessionStatus.Live };

        var act = () => session.Start();

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*Only Draft sessions can be started*");
    }

    [Fact]
    public void Start_WhenEnded_ThrowsInvalidOperationException()
    {
        var session = new Session { Status = SessionStatus.Ended };

        var act = () => session.Start();

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void End_WhenLive_MovesToEndedAndSetsEndedAt()
    {
        var session = new Session { Status = SessionStatus.Live };

        session.End();

        session.Status.Should().Be(SessionStatus.Ended);
        session.EndedAt.Should().NotBeNull();
    }

    [Fact]
    public void End_WhenDraft_ThrowsInvalidOperationException()
    {
        var session = new Session { Status = SessionStatus.Draft };

        var act = () => session.End();

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*Only Live sessions can be ended*");
    }

    [Fact]
    public void End_WhenAlreadyEnded_ThrowsInvalidOperationException()
    {
        var session = new Session { Status = SessionStatus.Ended };

        var act = () => session.End();

        act.Should().Throw<InvalidOperationException>();
    }
}
