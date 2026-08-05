using PulseBoard.Application.Common.Interfaces;

namespace PulseBoard.Infrastructure.Services;

public class JoinCodeGenerator : IJoinCodeGenerator
{
    private readonly IApplicationDbContext _db;
    private static readonly Random Random = new();

    public JoinCodeGenerator(IApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<string> GenerateUniqueCodeAsync(CancellationToken cancellationToken)
    {
        string code;
        var attempts = 0;

        do
        {
            code = Random.Next(100000, 999999).ToString();
            attempts++;

            if (attempts > 20)
                throw new InvalidOperationException(
                    "Could not generate a unique join code after 20 attempts — join-code space may be exhausted.");
        }
        while (_db.Sessions.Any(s => s.JoinCode == code));

        return await Task.FromResult(code);
    }
}
