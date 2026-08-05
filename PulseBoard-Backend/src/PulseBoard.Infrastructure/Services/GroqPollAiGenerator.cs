using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using PulseBoard.Application.Common.Exceptions;
using PulseBoard.Application.Common.Interfaces;
using PulseBoard.Application.Common.Models;

namespace PulseBoard.Infrastructure.Services;

/// <summary>
/// Calls Groq's chat completions endpoint (OpenAI-compatible API shape,
/// genuinely free tier — good fit for a portfolio demo that shouldn't cost
/// anything to run). Swapping to a different provider later only means
/// writing a new class against IPollAiGenerator — nothing above
/// Infrastructure needs to change.
/// </summary>
public class GroqPollAiGenerator : IPollAiGenerator
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<GroqPollAiGenerator> _logger;

    private const string ChatCompletionsEndpoint = "https://api.groq.com/openai/v1/chat/completions";

    public GroqPollAiGenerator(HttpClient httpClient, IConfiguration configuration, ILogger<GroqPollAiGenerator> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<PollSuggestionDto> GenerateAsync(string topic, CancellationToken cancellationToken)
    {
        var apiKey = _configuration["Ai:GroqApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
            throw new AiGenerationException(
                "AI poll generation isn't configured on this server yet (missing Groq API key).");

        var model = _configuration["Ai:Model"] ?? "llama-3.1-8b-instant";

        var systemPrompt =
            "You write live-audience poll questions for events (like Slido/Kahoot). " +
            "Given a topic, respond with ONLY a JSON object, no markdown fences, no extra text, in this exact shape: " +
            "{\"question\": \"...\", \"options\": [\"...\", \"...\", \"...\", \"...\"]}. " +
            "The question must be short (under 20 words) and neutral. Provide exactly 4 short, distinct options " +
            "(each under 8 words). Do not include an 'Other' or 'None of the above' option.";

        var requestBody = new
        {
            model,
            messages = new object[]
            {
                new { role = "system", content = systemPrompt },
                new { role = "user", content = $"Topic: {topic}" }
            },
            temperature = 0.7,
            response_format = new { type = "json_object" }
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, ChatCompletionsEndpoint)
        {
            Content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json")
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.SendAsync(request, cancellationToken);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            _logger.LogWarning(ex, "AI provider request failed for topic '{Topic}'", topic);
            throw new AiGenerationException("Couldn't reach the AI service. Try again, or write the poll manually.", ex);
        }

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogWarning("AI provider returned {StatusCode}: {Body}", response.StatusCode, errorBody);
            throw new AiGenerationException("The AI service couldn't generate a poll right now. Try again, or write it manually.");
        }

        var responseJson = await response.Content.ReadAsStringAsync(cancellationToken);

        try
        {
            using var doc = JsonDocument.Parse(responseJson);
            var content = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString() ?? throw new AiGenerationException("The AI service returned an empty response.");

            using var suggestionDoc = JsonDocument.Parse(content);
            var question = suggestionDoc.RootElement.GetProperty("question").GetString()?.Trim();
            var options = suggestionDoc.RootElement.GetProperty("options")
                .EnumerateArray()
                .Select(o => o.GetString()?.Trim() ?? string.Empty)
                .Where(o => o.Length > 0)
                .ToList();

            if (string.IsNullOrWhiteSpace(question) || options.Count < 2)
                throw new AiGenerationException("The AI service returned something unusable. Try rephrasing the topic.");

            return new PollSuggestionDto(question, options);
        }
        catch (Exception ex) when (ex is JsonException or KeyNotFoundException or IndexOutOfRangeException)
        {
            _logger.LogWarning(ex, "Failed to parse AI response for topic '{Topic}': {Response}", topic, responseJson);
            throw new AiGenerationException("Couldn't parse the AI's response. Try again, or write the poll manually.", ex);
        }
    }
}
