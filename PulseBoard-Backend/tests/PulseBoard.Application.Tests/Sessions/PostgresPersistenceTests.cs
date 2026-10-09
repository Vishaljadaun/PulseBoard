using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using PulseBoard.Application.Auth.Commands.Login;
using PulseBoard.Application.Auth.Commands.Register;
using PulseBoard.Application.Common.Exceptions;
using PulseBoard.Application.Common.Interfaces;
using PulseBoard.Application.Common.Models;
using PulseBoard.Application.Polls.Commands.ActivatePoll;
using PulseBoard.Application.Polls.Commands.CastVote;
using PulseBoard.Application.Sessions.Commands.CreateSession;
using PulseBoard.Application.Sessions.Commands.DuplicateSession;
using PulseBoard.Application.Sessions.Commands.EndSession;
using PulseBoard.Application.Sessions.Commands.StartSession;
using PulseBoard.Application.Sessions.Queries.GetSessionReport;
using PulseBoard.Domain.Entities;
using PulseBoard.Infrastructure;
using PulseBoard.Infrastructure.Persistence;
using Xunit;

namespace PulseBoard.Application.Tests.Sessions;

// Optional locally; mandatory in CI through the PostgreSQL service configuration.
public sealed class PostgresFactAttribute : FactAttribute
{
    public PostgresFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("PULSEBOARD_TEST_POSTGRES")))
            Skip = "Set PULSEBOARD_TEST_POSTGRES to run against a dedicated test PostgreSQL server.";
    }
}

public class PostgresPersistenceTests
{
    [PostgresFact]
    public async Task MigrationAndFreshApplicationProviders_PreserveAccountSessionAnswersAndReport()
    {
        var connection = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("PULSEBOARD_TEST_POSTGRES"));
        // The supplied server must be a disposable test server with CREATE DATABASE privileges.
        // Create an isolated DB and only ever drop the generated name, never the supplied database.
        var database = "pulseboard_test_" + Guid.NewGuid().ToString("N");
        await using var admin = new NpgsqlConnection(connection.ConnectionString);
        await admin.OpenAsync();
        await using (var create = new NpgsqlCommand($"CREATE DATABASE \"{database}\"", admin)) await create.ExecuteNonQueryAsync();
        connection.Database = database;
        connection.Pooling = false;
        try
        {
            Guid hostId; Guid sessionId;
            const string email = "trainer@example.test";
            const string password = "Local-test-only-password-123!";
            var user = new CurrentUser();
            var notifier = new Notifier();
            // First application instance: migrate, register, teach, and collect responses.
            using (var application = BuildApplication(connection.ConnectionString))
            using (var scope = application.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                await db.Database.MigrateAsync();
                db.Database.HasPendingModelChanges().Should().BeFalse();
                var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
                var tokens = scope.ServiceProvider.GetRequiredService<IJwtTokenGenerator>();
                var registered = await new RegisterCommandHandler(db, hasher, tokens).Handle(new("Trainer", email, password), default);
                hostId = registered.HostId; user.HostId = hostId;
                db.Hosts.Single().PasswordHash.Should().NotBe(password);
                var session = await new CreateSessionCommandHandler(db, scope.ServiceProvider.GetRequiredService<IJoinCodeGenerator>(), user)
                    .Handle(new("Onboarding", "Async basics", new() { new("Which answer?", new() { "Correct", "Other" }, 0) }), default);
                sessionId = session.Id;
                await new StartSessionCommandHandler(db, user).Handle(new(session.Id), default);
                var poll = await db.Polls.Include(p => p.Options).SingleAsync(p => p.SessionId == session.Id);
                await new ActivatePollCommandHandler(db, user, notifier).Handle(new(poll.Id), default);
                await new CastVoteCommandHandler(db, notifier).Handle(new(poll.Id, poll.Options.Single(o => o.IsCorrect).Id, Guid.NewGuid()), default);
                await new EndSessionCommandHandler(db, user, notifier).Handle(new(session.Id), default);
            }
            // Completely new DI container/context: same startup migrations and normal login.
            using (var restartedApplication = BuildApplication(connection.ConnectionString))
            using (var scope = restartedApplication.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                await db.Database.MigrateAsync(); // A redeploy/startup must not reset existing data.
                (await db.Database.GetAppliedMigrationsAsync()).Should().ContainSingle();
                var login = await new LoginCommandHandler(db, scope.ServiceProvider.GetRequiredService<IPasswordHasher>(), scope.ServiceProvider.GetRequiredService<IJwtTokenGenerator>())
                    .Handle(new(email, password), default);
                login.HostId.Should().Be(hostId); login.Token.Should().NotBeNullOrWhiteSpace();
                var report = await new GetSessionReportQueryHandler(db, user).Handle(new(sessionId), default);
                report.Session.Status.Should().Be("Ended"); report.TotalResponses.Should().Be(1); report.Accuracy.Should().Be(100);
                var copy = await new DuplicateSessionCommandHandler(db, user, scope.ServiceProvider.GetRequiredService<IJoinCodeGenerator>()).Handle(new(sessionId), default);
                var copiedReport = await new GetSessionReportQueryHandler(db, user).Handle(new(copy.Id), default);
                copiedReport.TotalResponses.Should().Be(0); copiedReport.Questions.Should().ContainSingle();
                var registerAgain = () => new RegisterCommandHandler(db, scope.ServiceProvider.GetRequiredService<IPasswordHasher>(), scope.ServiceProvider.GetRequiredService<IJwtTokenGenerator>())
                    .Handle(new("Trainer", email, password), default);
                await registerAgain.Should().ThrowAsync<BusinessRuleException>();
            }
        }
        finally
        {
            await using var drop = new NpgsqlCommand($"DROP DATABASE \"{database}\" WITH (FORCE)", admin);
            await drop.ExecuteNonQueryAsync();
        }
    }

    private static ServiceProvider BuildApplication(string connection)
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Database:Provider"] = "PostgreSQL", ["ConnectionStrings:PostgreSqlConnection"] = connection,
            ["Jwt:Secret"] = "This-is-a-local-test-signing-key-at-least-32-characters",
            ["Jwt:Issuer"] = "PulseBoard.Tests", ["Jwt:Audience"] = "PulseBoard.Tests"
        }).Build();
        var services = new ServiceCollection();
        services.AddSingleton<IConfiguration>(configuration);
        services.AddLogging(); services.AddInfrastructure(configuration);
        return services.BuildServiceProvider();
    }
    private sealed class CurrentUser : ICurrentUserService { public Guid? HostId { get; set; } }
    private sealed class Notifier : ISessionHubNotifier
    {
        public Task PollActivated(Guid sessionId, PollDto poll) => Task.CompletedTask;
        public Task PollResultsUpdated(Guid sessionId, PollResultsDto results) => Task.CompletedTask;
        public Task PollClosed(Guid sessionId, Guid pollId) => Task.CompletedTask;
        public Task SessionEnded(Guid sessionId) => Task.CompletedTask;
    }
}
