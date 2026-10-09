using System.Net;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using PulseBoard.Application.Common.Exceptions;
using PulseBoard.Infrastructure.Services;
using Xunit;

namespace PulseBoard.Application.Tests.Polls;

public class GroqPollAiGeneratorTests
{
    private static string Envelope(object quiz) => JsonSerializer.Serialize(new
    {
        choices = new[] { new { message = new { content = JsonSerializer.Serialize(quiz) } } }
    });

    private static GroqPollAiGenerator Create(Handler handler, string? key = "test-key", string? model = null)
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        { ["Ai:GroqApiKey"] = key, ["Ai:Model"] = model }).Build();
        return new GroqPollAiGenerator(new HttpClient(handler), config, NullLogger<GroqPollAiGenerator>.Instance);
    }

    [Fact]
    public async Task ValidResponse_UsesCurrentDefaultAndPreservesCorrectIndex()
    {
        var handler = new Handler(HttpStatusCode.OK, Envelope(new
        { question = " Which type represents an asynchronous operation? ", options = new[] { " string ", "Task", "int", "bool" }, correctOptionIndex = 1 }));
        var result = await Create(handler).GenerateAsync(".NET async", default);
        result.CorrectOptionIndex.Should().Be(1);
        result.Options[0].Should().Be("string");
        using var request = JsonDocument.Parse(handler.RequestBody!);
        request.RootElement.GetProperty("model").GetString().Should().Be("openai/gpt-oss-20b");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("YOUR_GROQ_API_KEY_HERE")]
    [InlineData("REPLACE_WITH_KEY")]
    public async Task MissingOrPlaceholderKey_DoesNotCallProvider(string? key)
    {
        var handler = new Handler(HttpStatusCode.OK, "{}");
        var action = () => Create(handler, key).GenerateAsync("Topic", default);
        var error = (await action.Should().ThrowAsync<AiGenerationException>()).Which;
        error.Code.Should().Be("ai_configuration");
        error.Retryable.Should().BeFalse();
        handler.Calls.Should().Be(0);
    }

    [Theory]
    [InlineData(401, "ai_configuration", false)]
    [InlineData(403, "ai_configuration", false)]
    [InlineData(404, "ai_configuration", false)]
    [InlineData(400, "ai_configuration", false)]
    [InlineData(429, "ai_rate_limited", true)]
    [InlineData(503, "ai_unavailable", true)]
    public async Task ProviderFailure_HasSafeActionableError(int status, string code, bool retryable)
    {
        var handler = new Handler((HttpStatusCode)status, "private-provider-details");
        var action = () => Create(handler).GenerateAsync("Topic", default);
        var error = (await action.Should().ThrowAsync<AiGenerationException>()).Which;
        error.Code.Should().Be(code);
        error.Retryable.Should().Be(retryable);
        error.Message.Should().NotContain("private-provider-details");
    }

    [Theory]
    [InlineData("{}")]
    [InlineData("{\"question\":\"Q\",\"options\":[\"A\",\"\",\"C\",\"D\"],\"correctOptionIndex\":2}")]
    [InlineData("{\"question\":\"Q\",\"options\":[\"A\",\"A\",\"C\",\"D\"],\"correctOptionIndex\":0}")]
    [InlineData("{\"question\":\"Q\",\"options\":[\"A\",\"B\",\"C\",\"D\"],\"correctOptionIndex\":9}")]
    [InlineData("{\"question\":\"Q\",\"options\":[\"A\",\"B\",\"C\",\"D\"]}")]
    [InlineData("{\"question\":\"Q\",\"options\":null,\"correctOptionIndex\":0}")]
    public async Task InvalidQuiz_DoesNotGuessAnAnswer(string quiz)
    {
        var envelope = JsonSerializer.Serialize(new { choices = new[] { new { message = new { content = quiz } } } });
        var action = () => Create(new Handler(HttpStatusCode.OK, envelope)).GenerateAsync("Topic", default);
        var error = (await action.Should().ThrowAsync<AiGenerationException>()).Which;
        error.Code.Should().Be("ai_invalid_response");
    }

    [Fact]
    public async Task CallerCancellation_IsNotReportedAsProviderFailure()
    {
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();
        var handler = new Handler(HttpStatusCode.OK, "{}");
        var action = () => Create(handler).GenerateAsync("Topic", cancellation.Token);
        await action.Should().ThrowAsync<OperationCanceledException>();
        handler.Calls.Should().Be(0);
    }

    [Fact]
    public async Task Timeout_IsRetryable()
    {
        var handler = new Handler(HttpStatusCode.OK, "{}") { Failure = new TaskCanceledException() };
        var action = () => Create(handler).GenerateAsync("Topic", default);
        var error = (await action.Should().ThrowAsync<AiGenerationException>()).Which;
        error.Code.Should().Be("ai_timeout");
        error.Retryable.Should().BeTrue();
    }

    private sealed class Handler(HttpStatusCode status, string body) : HttpMessageHandler
    {
        public int Calls { get; private set; }
        public string? RequestBody { get; private set; }
        public Exception? Failure { get; init; }
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Calls++;
            RequestBody = await request.Content!.ReadAsStringAsync(cancellationToken);
            if (Failure is not null) throw Failure;
            return new HttpResponseMessage(status) { Content = new StringContent(body, Encoding.UTF8, "application/json") };
        }
    }
}
