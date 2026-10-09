using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using PulseBoard.Application.Common.Interfaces;

namespace PulseBoard.Infrastructure.Persistence;

public static class DatabaseConfiguration
{
    public static IServiceCollection AddPulseBoardDatabase(this IServiceCollection services, IConfiguration configuration)
    {
        var provider = (configuration["Database:Provider"] ?? "Sqlite").Trim();
        if (provider.Equals("PostgreSQL", StringComparison.OrdinalIgnoreCase))
        {
            var connection = ValidatePostgresConnection(configuration.GetConnectionString("PostgreSqlConnection"));
            services.AddDbContext<PostgresApplicationDbContext>(options => options.UseNpgsql(connection,
                postgres => postgres.EnableRetryOnFailure(3)));
            services.AddScoped<ApplicationDbContext>(provider => provider.GetRequiredService<PostgresApplicationDbContext>());
        }
        else if (provider.Equals("Sqlite", StringComparison.OrdinalIgnoreCase))
        {
            var connection = configuration.GetConnectionString("DefaultConnection");
            if (string.IsNullOrWhiteSpace(connection))
                throw new InvalidOperationException("SQLite requires ConnectionStrings__DefaultConnection.");
            services.AddDbContext<ApplicationDbContext>(options => options.UseSqlite(connection));
        }
        else
        {
            throw new InvalidOperationException("Database__Provider must be Sqlite or PostgreSQL.");
        }
        services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<ApplicationDbContext>());
        return services;
    }

    private static string ValidatePostgresConnection(string? value)
    {
        // Never fall back to a local file when production PostgreSQL is misconfigured.
        // Do not echo the supplied value or attach a parser exception (it may contain credentials).
        const string message = "PostgreSQL requires ConnectionStrings__PostgreSqlConnection in .NET format: " +
            "Host=...;Database=...;Username=...;Password=...;SSL Mode=VerifyFull. See docs/DATABASE_SETUP.md.";
        if (string.IsNullOrWhiteSpace(value)) throw new InvalidOperationException(message);
        try
        {
            var connection = new NpgsqlConnectionStringBuilder(value);
            if (string.IsNullOrWhiteSpace(connection.Host) || string.IsNullOrWhiteSpace(connection.Database) ||
                string.IsNullOrWhiteSpace(connection.Username))
                throw new ArgumentException();
            return connection.ConnectionString;
        }
        catch (ArgumentException) { throw new InvalidOperationException(message); }
        catch (FormatException) { throw new InvalidOperationException(message); }
    }
}
