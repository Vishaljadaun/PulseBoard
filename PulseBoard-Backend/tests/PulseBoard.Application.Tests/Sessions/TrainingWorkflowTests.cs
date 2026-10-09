using FluentAssertions;
using FluentValidation;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using PulseBoard.Application.Common.Exceptions;
using PulseBoard.Application.Common.Interfaces;
using PulseBoard.Application.Sessions.Commands.CreateSession;
using PulseBoard.Application.Sessions.Commands.DuplicateSession;
using PulseBoard.Application.Sessions.Queries.GetSessionReport;
using PulseBoard.Domain.Entities;
using PulseBoard.Domain.Enums;
using PulseBoard.Infrastructure.Persistence;
using Xunit;

namespace PulseBoard.Application.Tests.Sessions;

public sealed class TrainingWorkflowTests : IDisposable
{
    private readonly SqliteConnection _connection = new("Data Source=:memory:");
    private readonly ApplicationDbContext _db;
    private readonly Host _host = new() { Name = "Trainer", Email = "trainer@example.test", PasswordHash = "test" };
    private readonly Session _source;
    private readonly CurrentUser _user;
    private readonly Codes _codes = new();

    public TrainingWorkflowTests()
    {
        _connection.Open();
        _db = new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>().UseSqlite(_connection).Options);
        _db.Database.EnsureCreated();
        _source = new Session { Host = _host, HostId = _host.Id, Title = "Onboarding", Topic = "Async", JoinCode = "123456", Status = SessionStatus.Ended, StartedAt = DateTime.UtcNow.AddMinutes(-10), EndedAt = DateTime.UtcNow };
        _db.Sessions.Add(_source); _db.SaveChanges(); _user = new CurrentUser(_host.Id);
    }

    private Poll AddQuestion(bool quiz, PollStatus status = PollStatus.Closed)
    {
        var poll = new Poll { SessionId = _source.Id, Question = quiz ? "Knowledge?" : "Confidence?", Status = status,
            Options = new List<PollOption> { new() { Text = "First", IsCorrect = quiz }, new() { Text = "Second" } } };
        _db.Polls.Add(poll); _db.SaveChanges(); return poll;
    }
    private void Vote(Poll poll, int option, Guid respondent)
    {
        _db.Votes.Add(new Vote { PollOptionId = poll.Options.ElementAt(option).Id, ParticipantId = respondent });
        _db.SaveChanges();
    }

    [Fact]
    public async Task Starter_PersistsAllQuestionsAndCorrectAnswersAsDrafts()
    {
        var command = new CreateSessionCommand(" New group ", " Async basics ", new()
        { new("Question?", new() { "A", "B" }, 1), new("Opinion?", new() { "Yes", "No" }, null) });
        var result = await new CreateSessionCommandHandler(_db, _codes, _user).Handle(command, default);
        _db.ChangeTracker.Clear();
        result.Title.Should().Be("New group"); result.Status.Should().Be("Draft");
        var polls = _db.Polls.Include(p => p.Options).Where(p => p.SessionId == result.Id).ToList();
        polls.Should().HaveCount(2); polls.Should().OnlyContain(p => p.Status == PollStatus.Draft);
        polls.Single(p => p.Question == "Question?").Options.Single(o => o.IsCorrect).Text.Should().Be("B");
        polls.Single(p => p.Question == "Opinion?").Options.Should().OnlyContain(o => !o.IsCorrect);
    }

    [Theory]
    [InlineData("", 0)]
    [InlineData("Valid?", 2)]
    public async Task InvalidStarter_DoesNotPersistPartialSession(string question, int correct)
    {
        var before = _db.Sessions.Count();
        var action = () => new CreateSessionCommandHandler(_db, _codes, _user).Handle(
            new CreateSessionCommand("Title", "Topic", new() { new(question, new() { "A", "B" }, correct) }), default);
        await action.Should().ThrowAsync<ValidationException>();
        _db.Sessions.Count().Should().Be(before); _db.Polls.Should().BeEmpty();
    }

    [Fact]
    public async Task NullOptionsAndNullQuestions_AreValidationFailures()
    {
        var handler = new CreateSessionCommandHandler(_db, _codes, _user);
        var nullOptions = () => handler.Handle(new("Title", "Topic", new() { new("Question?", null!, 0) }), default);
        await nullOptions.Should().ThrowAsync<ValidationException>();
        var nullQuestion = () => handler.Handle(new("Title", "Topic", new() { null! }), default);
        await nullQuestion.Should().ThrowAsync<ValidationException>();
        _db.Polls.Should().BeEmpty();
    }

    [Fact]
    public async Task BlankSession_RemainsBackwardCompatible()
    {
        var result = await new CreateSessionCommandHandler(_db, _codes, _user).Handle(new("Blank", "Topic"), default);
        result.Status.Should().Be("Draft"); _db.Polls.Should().BeEmpty();
    }

    [Fact]
    public async Task Duplicate_ResetsIdentityStateAndVotesButPreservesAnswers()
    {
        var poll = AddQuestion(true); Vote(poll, 0, Guid.NewGuid());
        var result = await new DuplicateSessionCommandHandler(_db, _user, _codes).Handle(new(_source.Id), default);
        _db.ChangeTracker.Clear();
        result.Id.Should().NotBe(_source.Id); result.JoinCode.Should().NotBe(_source.JoinCode);
        result.Status.Should().Be("Draft"); result.StartedAt.Should().BeNull(); result.EndedAt.Should().BeNull();
        var copied = _db.Polls.Include(p => p.Options).ThenInclude(o => o.Votes).Single(p => p.SessionId == result.Id);
        copied.Id.Should().NotBe(poll.Id); copied.Status.Should().Be(PollStatus.Draft);
        copied.Options.Single(o => o.IsCorrect).Text.Should().Be("First");
        copied.Options.SelectMany(o => o.Votes).Should().BeEmpty();
        _db.Votes.Count().Should().Be(1);
        _db.Sessions.Single(s => s.Id == _source.Id).Status.Should().Be(SessionStatus.Ended);
    }

    [Fact]
    public async Task Report_DeduplicatesRespondentsAndExcludesOpinionsFromAccuracy()
    {
        var quiz = AddQuestion(true); var opinion = AddQuestion(false); var unanswered = AddQuestion(true, PollStatus.Draft);
        var person = Guid.NewGuid(); Vote(quiz, 0, person); Vote(quiz, 1, Guid.NewGuid()); Vote(opinion, 1, person);
        var report = await new GetSessionReportQueryHandler(_db, _user).Handle(new(_source.Id), default);
        report.Respondents.Should().Be(2); report.TotalResponses.Should().Be(3);
        report.QuizResponses.Should().Be(2); report.Accuracy.Should().Be(50);
        report.Questions.Single(q => q.Id == opinion.Id).CorrectResponses.Should().BeNull();
        report.Questions.Single(q => q.Id == unanswered.Id).Accuracy.Should().BeNull();
    }

    [Fact]
    public async Task EmptyReport_HasNoInventedScore()
    {
        var report = await new GetSessionReportQueryHandler(_db, _user).Handle(new(_source.Id), default);
        report.Accuracy.Should().BeNull(); report.Respondents.Should().Be(0); report.Questions.Should().BeEmpty();
    }

    [Fact]
    public async Task Report_WeightsAccuracyByResponsesRatherThanAveragingQuestionPercentages()
    {
        var first = AddQuestion(true); var second = AddQuestion(true);
        Vote(first, 0, Guid.NewGuid());
        for (var i = 0; i < 3; i++) Vote(second, 1, Guid.NewGuid());
        var report = await new GetSessionReportQueryHandler(_db, _user).Handle(new(_source.Id), default);
        report.Accuracy.Should().Be(25);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task OtherHostOrAnonymous_CannotReadReportOrDuplicate(bool anonymous)
    {
        var stranger = new CurrentUser(anonymous ? null : Guid.NewGuid());
        var report = () => new GetSessionReportQueryHandler(_db, stranger).Handle(new(_source.Id), default);
        var copy = () => new DuplicateSessionCommandHandler(_db, stranger, _codes).Handle(new(_source.Id), default);
        await report.Should().ThrowAsync<UnauthorizedException>();
        await copy.Should().ThrowAsync<UnauthorizedException>();
        _db.Sessions.Count().Should().Be(1);
    }

    public void Dispose() { _db.Dispose(); _connection.Dispose(); }
    private sealed record CurrentUser(Guid? HostId) : ICurrentUserService;
    private sealed class Codes : IJoinCodeGenerator
    {
        private int _next = 200000;
        public Task<string> GenerateUniqueCodeAsync(CancellationToken cancellationToken = default) => Task.FromResult((++_next).ToString());
    }
}
