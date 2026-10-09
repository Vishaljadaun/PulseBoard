using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using PulseBoard.Application.Common.Exceptions;
using PulseBoard.Application.Common.Interfaces;
using PulseBoard.Application.Common.Models;
using PulseBoard.Application.Polls.Commands.ActivatePoll;
using PulseBoard.Application.Polls.Commands.CastVote;
using PulseBoard.Application.Polls.Commands.CreatePoll;
using PulseBoard.Application.Polls.Queries.GetActivePoll;
using PulseBoard.Application.Sessions.Commands.EndSession;
using PulseBoard.Application.Sessions.Queries.GetSessionStatus;
using PulseBoard.Domain.Entities;
using PulseBoard.Domain.Enums;
using PulseBoard.Infrastructure.Persistence;
using Xunit;

namespace PulseBoard.Application.Tests.Sessions;

// SQLite exercises the real mappings and queries, including persisted state.
public sealed class SessionLifecycleTests : IDisposable
{
    private readonly SqliteConnection _connection = new("Data Source=:memory:");
    private readonly ApplicationDbContext _db;
    private readonly Session _session;
    private readonly Poll _poll;
    private readonly Notifier _notifier = new();
    private readonly CurrentUser _user;

    public SessionLifecycleTests()
    {
        _connection.Open();
        _db = new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite(_connection).Options);
        _db.Database.EnsureCreated();
        var host = new Host { Name = "Host", Email = "host@example.test", PasswordHash = "test-only" };
        _session = new Session { Host = host, HostId = host.Id, Title = "Demo", Topic = "Testing", JoinCode = "123456", Status = SessionStatus.Live };
        _poll = new Poll { Session = _session, SessionId = _session.Id, Question = "Ready?", Status = PollStatus.Active,
            Options = new List<PollOption> { new() { Text = "Yes" }, new() { Text = "No" } } };
        _db.Polls.Add(_poll);
        _db.SaveChanges();
        _user = new CurrentUser(host.Id);
    }

    [Fact]
    public async Task End_ClosesActivePollAndPersistsSessionBeforeNotifying()
    {
        _notifier.OnEnded = () =>
        {
            _db.ChangeTracker.Clear();
            _db.Sessions.Single().Status.Should().Be(SessionStatus.Ended);
            _db.Polls.Single().Status.Should().Be(PollStatus.Closed);
        };
        var result = await new EndSessionCommandHandler(_db, _user, _notifier)
            .Handle(new EndSessionCommand(_session.Id), default);
        result.Status.Should().Be("Ended");
        _db.Polls.Single().ClosedAt.Should().NotBeNull();
        _notifier.EndedSessions.Should().ContainSingle().Which.Should().Be(_session.Id);
    }

    [Fact]
    public async Task End_ByAnotherHost_DoesNotChangeSessionOrPoll()
    {
        var action = () => new EndSessionCommandHandler(_db, new CurrentUser(Guid.NewGuid()), _notifier)
            .Handle(new EndSessionCommand(_session.Id), default);
        await action.Should().ThrowAsync<UnauthorizedException>();
        _session.Status.Should().Be(SessionStatus.Live);
        _poll.Status.Should().Be(PollStatus.Active);
        _notifier.EndedSessions.Should().BeEmpty();
    }

    [Theory]
    [InlineData(SessionStatus.Draft)]
    [InlineData(SessionStatus.Ended)]
    public async Task Activate_OutsideLiveSession_IsRejected(SessionStatus status)
    {
        _session.Status = status;
        _poll.Status = PollStatus.Draft;
        await _db.SaveChangesAsync();
        var action = () => new ActivatePollCommandHandler(_db, _user, _notifier)
            .Handle(new ActivatePollCommand(_poll.Id), default);
        await action.Should().ThrowAsync<BusinessRuleException>();
        _poll.Status.Should().Be(PollStatus.Draft);
    }

    [Fact]
    public async Task Activate_InLiveSession_Succeeds()
    {
        _poll.Status = PollStatus.Draft;
        await _db.SaveChangesAsync();
        var result = await new ActivatePollCommandHandler(_db, _user, _notifier)
            .Handle(new ActivatePollCommand(_poll.Id), default);
        result.Status.Should().Be("Active");
    }

    [Theory]
    [InlineData(SessionStatus.Draft)]
    [InlineData(SessionStatus.Ended)]
    public async Task Vote_OutsideLiveSession_IsRejectedEvenWithLegacyActivePoll(SessionStatus status)
    {
        _session.Status = status;
        await _db.SaveChangesAsync();
        var action = () => new CastVoteCommandHandler(_db, _notifier)
            .Handle(new CastVoteCommand(_poll.Id, _poll.Options.First().Id, Guid.NewGuid()), default);
        await action.Should().ThrowAsync<BusinessRuleException>();
        _db.Votes.Should().BeEmpty();
    }

    [Fact]
    public async Task Vote_InLiveSession_IsCounted()
    {
        var result = await new CastVoteCommandHandler(_db, _notifier)
            .Handle(new CastVoteCommand(_poll.Id, _poll.Options.First().Id, Guid.NewGuid()), default);
        result.Results.TotalVotes.Should().Be(1);
    }

    [Theory]
    [InlineData(SessionStatus.Draft)]
    [InlineData(SessionStatus.Ended)]
    public async Task ActivePoll_OutsideLiveSession_IsHidden(SessionStatus status)
    {
        _session.Status = status;
        await _db.SaveChangesAsync();
        var result = await new GetActivePollQueryHandler(_db)
            .Handle(new GetActivePollQuery(_session.Id), default);
        result.Should().BeNull();
    }

    [Fact]
    public async Task CreatePoll_AfterEnd_IsRejected()
    {
        _session.Status = SessionStatus.Ended;
        await _db.SaveChangesAsync();
        var action = () => new CreatePollCommandHandler(_db, _user)
            .Handle(new CreatePollCommand(_session.Id, "Another?", new() { "Yes", "No" }, null), default);
        await action.Should().ThrowAsync<BusinessRuleException>();
        _db.Polls.Count().Should().Be(1);
    }

    [Fact]
    public async Task PublicStatus_ReturnsEndedAfterSessionEnds()
    {
        await new EndSessionCommandHandler(_db, _user, _notifier)
            .Handle(new EndSessionCommand(_session.Id), default);
        var result = await new GetSessionStatusQueryHandler(_db)
            .Handle(new GetSessionStatusQuery(_session.Id), default);
        result.Status.Should().Be("Ended");
    }

    public void Dispose() { _db.Dispose(); _connection.Dispose(); }
    private sealed record CurrentUser(Guid? HostId) : ICurrentUserService;
    private sealed class Notifier : ISessionHubNotifier
    {
        public List<Guid> EndedSessions { get; } = new();
        public Action? OnEnded { get; set; }
        public Task PollActivated(Guid sessionId, PollDto poll) => Task.CompletedTask;
        public Task PollResultsUpdated(Guid sessionId, PollResultsDto results) => Task.CompletedTask;
        public Task PollClosed(Guid sessionId, Guid pollId) => Task.CompletedTask;
        public Task SessionEnded(Guid sessionId)
        {
            OnEnded?.Invoke();
            EndedSessions.Add(sessionId);
            return Task.CompletedTask;
        }
    }
}
