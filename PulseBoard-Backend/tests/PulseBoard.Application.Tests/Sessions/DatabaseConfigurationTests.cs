using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using PulseBoard.Application.Common.Interfaces;
using PulseBoard.Infrastructure.Persistence;
using Xunit;

namespace PulseBoard.Application.Tests.Sessions;

public class DatabaseConfigurationTests
{
    private static IConfiguration Config(params (string Key, string Value)[] entries) =>
        new ConfigurationBuilder().AddInMemoryCollection(entries.ToDictionary(x => x.Key, x => (string?)x.Value)).Build();

    [Fact]
    public void DefaultConfiguration_KeepsSqliteForLocalDevelopment()
    {
        var services = new ServiceCollection();
        services.AddPulseBoardDatabase(Config(("ConnectionStrings:DefaultConnection", "Data Source=:memory:")));
        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.Database.ProviderName.Should().Be("Microsoft.EntityFrameworkCore.Sqlite");
        scope.ServiceProvider.GetRequiredService<IApplicationDbContext>().Should().BeSameAs(db);
        db.Database.GetMigrations().Should().HaveCount(2).And.NotContain("20261009160000_InitialPostgres");
    }

    [Fact]
    public void PostgresConfiguration_UsesSeparateMigrationsAndOneScopedContext()
    {
        var services = new ServiceCollection();
        services.AddPulseBoardDatabase(Config(("Database:Provider", "PostgreSQL"),
            ("ConnectionStrings:PostgreSqlConnection", "Host=localhost;Database=test;Username=test;Password=testing")));
        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.Should().BeOfType<PostgresApplicationDbContext>();
        db.Database.ProviderName.Should().Be("Npgsql.EntityFrameworkCore.PostgreSQL");
        scope.ServiceProvider.GetRequiredService<IApplicationDbContext>().Should().BeSameAs(db);
        db.Database.GetMigrations().Should().ContainSingle().Which.Should().Be("20261009160000_InitialPostgres");
        db.Database.HasPendingModelChanges().Should().BeFalse("the PostgreSQL snapshot must match the shared entity model");
    }

    [Theory]
    [InlineData("")]
    [InlineData("Data Source=pulseboard.db")]
    [InlineData("Host=localhost;Password=private-test-value")]
    [InlineData("postgresql://name:private-test-value@localhost/db")]
    public void BrokenPostgresSettings_NeverFallBackOrExposeCredentials(string connection)
    {
        var action = () => new ServiceCollection().AddPulseBoardDatabase(Config(("Database:Provider", "PostgreSQL"),
            ("ConnectionStrings:DefaultConnection", "Data Source=pulseboard.db"),
            ("ConnectionStrings:PostgreSqlConnection", connection)));
        var error = action.Should().Throw<InvalidOperationException>().Which;
        error.Message.Should().Contain("ConnectionStrings__PostgreSqlConnection").And.NotContain("private-test-value");
        error.InnerException.Should().BeNull();
    }

    [Fact]
    public void UnknownProvider_IsRejected()
    {
        var action = () => new ServiceCollection().AddPulseBoardDatabase(Config(("Database:Provider", "Postgress")));
        action.Should().Throw<InvalidOperationException>();
    }
}
