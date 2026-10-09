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
        // Local SQLite remains available; hosted accounts need a persistent database.
        services.AddPulseBoardDatabase(configuration);

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
