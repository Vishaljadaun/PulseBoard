using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PulseBoard.API.Hubs;
using PulseBoard.API.Middleware;
using PulseBoard.API.Services;
using PulseBoard.Application;
using PulseBoard.Application.Common.Interfaces;
using PulseBoard.Infrastructure;
using PulseBoard.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

// ---- Config sources, rebuilt without file-watching ----
// WebApplication.CreateBuilder wires up appsettings.json / appsettings.
// {env}.json with reloadOnChange: true by default, which sets up a
// FileSystemWatcher (inotify on Linux). Render's free-tier containers have
// a very low inotify instance limit, and the app crashes on startup the
// moment it's hit — this rebuilds the same sources with reloadOnChange:
// false so no file watcher is ever created. Nothing else about config
// resolution changes (env vars still override appsettings.json as usual).
builder.Configuration.Sources.Clear();
builder.Configuration
    .AddJsonFile("appsettings.json", optional: false, reloadOnChange: false)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true, reloadOnChange: false)
    .AddEnvironmentVariables();

// User Secrets is normally added automatically by CreateBuilder in
// Development — but Sources.Clear() above wiped that out too, so it has to
// be re-added explicitly here or "Manage User Secrets" in Visual Studio
// stops doing anything locally (Jwt:Secret / Ai:GroqApiKey would silently
// fall back to the placeholder values in appsettings.json).
if (builder.Environment.IsDevelopment())
{
    builder.Configuration.AddUserSecrets<Program>(optional: true, reloadOnChange: false);
}

// ---- Layers (Clean Architecture composition root) ----
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

// ---- Current user (reads HostId from JWT claims) ----
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();

// ---- SignalR ----
builder.Services.AddSignalR();
builder.Services.AddScoped<ISessionHubNotifier, SessionHubNotifier>();

// ---- Controllers ----
builder.Services.AddControllers();

// ---- Swagger ----
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "PulseBoard API",
        Version = "v1",
        Description = "Module 1: Auth + Session lifecycle"
    });

    // Lets you paste a JWT into Swagger UI's "Authorize" button
    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Enter: Bearer {your JWT token}"
    });
    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// ---- JWT Authentication ----
var jwtSettings = builder.Configuration.GetSection("Jwt");
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    // By default, ASP.NET Core silently renames certain JWT claims on
    // validation (e.g. "sub" -> a legacy long-form URI). CurrentUserService
    // looks for the claim literally named "sub", so without this line it
    // would never find it and every authenticated request would 401 even
    // with a perfectly valid token.
    options.MapInboundClaims = false;

    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["Secret"]!))
    };

    // SignalR's browser client can't set an Authorization header on the
    // WebSocket handshake, so it sends the JWT as a query string param
    // instead (?access_token=...) — this reads it from there for hub
    // connections specifically, leaving normal REST endpoints unaffected.
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();

// ---- CORS (allow the React dev server) ----
const string CorsPolicy = "PulseBoardCors";
builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicy, policy =>
    {
        policy.WithOrigins(builder.Configuration["AllowedOrigin"] ?? "http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// ---- Auto-apply EF Core migrations on startup ----
// Runs in every environment (not just Development) since there's no way to
// open Package Manager Console against an Azure App Service — this is what
// creates/updates the live database automatically on first deploy.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    db.Database.Migrate();
}

app.UseMiddleware<ExceptionHandlingMiddleware>();

// Swagger stays enabled in Production too — this is a portfolio demo API,
// not an internal system, so letting visitors explore/try the endpoints is
// the point. Remove this "always on" behavior if you ever deploy something
// with real user data behind it.
app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "PulseBoard API v1");
});

app.UseHttpsRedirection();
app.UseCors(CorsPolicy);
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<SessionHub>("/hubs/session");

app.Run();

// Exposed for WebApplicationFactory in integration tests (Module 1 keeps this minimal)
public partial class Program { }
