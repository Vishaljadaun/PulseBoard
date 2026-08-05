using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using PulseBoard.Application.Common.Interfaces;
using PulseBoard.Infrastructure.Persistence;
using PulseBoard.Infrastructure.Services;

namespace PulseBoard.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        // SQLite — a single file, no external database server to provision.
        // Works locally and on free hosts like Render with zero setup.
        // Note: Render's free tier has an ephemeral filesystem, so the file
        // resets on redeploy/restart — fine for a portfolio demo, not for
        // real user data. See README "Deploying to Render" for details.
        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseSqlite(configuration.GetConnectionString("DefaultConnection")));

        services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<ApplicationDbContext>());

        services.AddScoped<IPasswordHasher, PasswordHasher>();
        services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();
        services.AddScoped<IJoinCodeGenerator, JoinCodeGenerator>();

        // Typed HttpClient with a sane timeout — AI calls that hang would
        // otherwise block a poll-creation request indefinitely.
        services.AddHttpClient<IPollAiGenerator, GroqPollAiGenerator>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(20);
        });

        return services;
    }
}
