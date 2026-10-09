# Keep accounts and sessions across Render restarts

PulseBoard writes accounts, sessions, polls, options, and votes to a database. By default that database is a local SQLite file. Render's local filesystem is ephemeral, so a restart, redeploy, or free-service spin-down can discard it. The solution is to store data in a separate PostgreSQL database while continuing to run the API on Render Free and the frontend on Vercel.

This change adds PostgreSQL support; it does not create a cloud database or change your live configuration automatically. SQLite still works for local practice.

## 1. Create a free Neon project

1. Open https://console.neon.tech and sign in.
2. Create a project named `pulseboard` on the **Free** plan. Choose a region close to your Render backend.
3. Keep the default database/role or create a dedicated one. Open **Connect** and note the host, database, username/role, and password privately.
4. For this single-instance portfolio API, use the **direct** connection hostname (connection pooling toggle off). Npgsql manages a small client-side connection pool. Direct access also keeps startup migrations straightforward.

Neon's free compute can sleep while its data remains in database storage. Free plans have usage/storage limits; check the current plan before relying on a particular allowance. Render's free PostgreSQL offering has an expiry period, so it is not the recommended long-lived portfolio database for this setup.

Sources checked October 9, 2026:
- https://render.com/docs/free
- https://neon.com/docs/introduction/plans
- https://neon.com/docs/get-started/connect-neon
- https://www.npgsql.org/doc/connection-string-parameters.html

## 2. Configure Render privately

After the PostgreSQL-support PR is merged, open the existing Render backend service's **Environment** page. Add these two variables together:

| Name | Value |
| --- | --- |
| `Database__Provider` | `PostgreSQL` |
| `ConnectionStrings__PostgreSqlConnection` | Your .NET/Npgsql connection string below |

Example with placeholders only:

```text
Host=YOUR_DIRECT_NEON_HOST;Port=5432;Database=YOUR_DATABASE;Username=YOUR_ROLE;Password=YOUR_PASSWORD;SSL Mode=VerifyFull;Maximum Pool Size=10;Timeout=30;Command Timeout=30
```

Replace each placeholder with the values from Neon. This is **.NET key/value format**, not the `postgresql://...` URL and not the `psql '...'` command. If using a URL to identify fields, decode any percent-encoded credentials before filling the .NET string. For a value containing a semicolon, enclose that value in double quotes and double any embedded quote (or use an NpgsqlConnectionStringBuilder locally). Do not quote the entire connection string in Render's value field.

`SSL Mode=VerifyFull` verifies the database server's certificate and hostname. Do not disable SSL for Neon. Use the exact host supplied by Neon. Never paste the real connection string into ChatGPT, GitHub, a screenshot, or Vercel frontend variables.

Keep `Jwt__Secret`, `AllowedOrigin`, AI settings, and the frontend's existing API URLs. `ConnectionStrings__DefaultConnection` remains for SQLite only; changing that value to a PostgreSQL string does not select the PostgreSQL provider.

Save and deploy the latest `main`. The backend applies its separate PostgreSQL migration automatically and logs `Database migrations completed using Npgsql.EntityFrameworkCore.PostgreSQL.` It never logs the connection string. If PostgreSQL configuration is invalid, startup fails with a configuration message; it does not fall back to temporary SQLite.

No frontend change or frontend redeploy is required for this database switch.

## 3. Understand the cutover before redeploying

A **new Neon database starts empty**. This change does not transfer SQLite data or restore accounts that Render already discarded. If you need existing records, preserve the current SQLite database before redeploying and arrange a controlled data import; CSV session reports do not back up accounts/password hashes. Do not delete or reset a populated database to troubleshoot connectivity.

For disposable portfolio data, create your account once after the switch. Afterwards, normal logins should work after backend restarts. Keep the same Neon project/branch/database/role in Render. Switching to a different empty database would make previous accounts appear missing again.

If a PostgreSQL deployment fails, correct the connection or network setting. Do not switch back to SQLite as a persistence fix. Rolling back code to a version without PostgreSQL support also switches the app back to local data; it does not delete Neon data but will make those accounts unavailable through the old app.

## 4. Verify persistence

1. Register an account, create a session and question, and run a test vote.
2. Log out, then log in with the same account.
3. Restart the Render backend and wait until live.
4. Log in again with the same credentials. Check that the session, question, and vote still exist.
5. Repeat after a code redeploy or idle wake-up. A cold-start delay is possible; it should not require re-registration.

An expired JWT may require **logging in** again; it should never require registering again. If registration says the email already exists, that account is still present—check the login error instead of creating a new identity.

## Local development and future migrations

Without `Database__Provider`, SQLite remains selected and keeps the existing migrations. PostgreSQL uses `PostgresApplicationDbContext`, its own initial migration, and a separate model snapshot in `Migrations/PostgreSql`. Do not apply SQLite migrations to PostgreSQL.

For each entity-model change, generate and review migrations for **both** providers using the appropriate configured connection and context:

```bash
# From PulseBoard-Backend; SQLite configuration selected:
dotnet ef migrations add YourChange --context ApplicationDbContext --project src/PulseBoard.Infrastructure --startup-project src/PulseBoard.API --output-dir Migrations

# With Database__Provider=PostgreSQL and a private local PostgreSQL connection configured:
dotnet ef migrations add YourChange --context PostgresApplicationDbContext --project src/PulseBoard.Infrastructure --startup-project src/PulseBoard.API --output-dir Migrations/PostgreSql
```

CI runs a PostgreSQL 16 service with disposable test credentials. The integration test creates a uniquely named test database, migrates it, registers a user, writes a completed session with a vote, destroys the application service provider, and creates another provider. It migrates again, logs in with the original account, verifies the report, and confirms a fresh session copy has no votes. Only the generated test database is dropped. For local integration testing, `PULSEBOARD_TEST_POSTGRES` must point to a dedicated disposable test server with CREATE DATABASE privileges, never a production server. Without that variable, the PostgreSQL integration test is skipped locally; CI sets it explicitly.

Startup migration is suitable for this single-instance portfolio deployment. For multiple backend replicas, move migration execution into one controlled deployment step before starting replicas. A separate database fixes backend-local file loss; it does not replace database backups or fix the voting concurrency work tracked in COMPLETION.md.
