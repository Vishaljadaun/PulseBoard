# Multi-stage build: compile with the full SDK, ship only the runtime.
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy csproj files first so Docker can cache the restore layer
COPY src/PulseBoard.Domain/*.csproj src/PulseBoard.Domain/
COPY src/PulseBoard.Application/*.csproj src/PulseBoard.Application/
COPY src/PulseBoard.Infrastructure/*.csproj src/PulseBoard.Infrastructure/
COPY src/PulseBoard.API/*.csproj src/PulseBoard.API/
RUN dotnet restore src/PulseBoard.API/PulseBoard.API.csproj

COPY src/ src/
RUN dotnet publish src/PulseBoard.API/PulseBoard.API.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app .

# Belt-and-braces alongside the code-level fix in Program.cs (which
# explicitly disables config file-watching) — this also tells the default
# host builder pipeline not to bother, in case Program.cs ever changes.
ENV DOTNET_hostBuilder__reloadConfigOnChange=false

EXPOSE 8080
# Render injects $PORT at runtime; this shell form resolves it when the
# container actually starts (a plain ENV can't do that at build time).
ENTRYPOINT ["/bin/sh", "-c", "ASPNETCORE_URLS=http://+:${PORT:-8080} dotnet PulseBoard.API.dll"]
