using KahveDurak.Api.Data;
using KahveDurak.Api.Data.Seed;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Testcontainers.PostgreSql;

namespace KahveDurak.Api.Tests.Infrastructure;

public class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    public const string AdminEmail = "admin@kahvedurak.local";
    public const string AdminPassword = "Admin-Test-Password-1";

    private readonly PostgreSqlContainer _db = new PostgreSqlBuilder()
        .WithImage("postgres:17-alpine")
        .WithDatabase("kahvedurak_test")
        .Build();

    public string ConnectionString => _db.GetConnectionString();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:Default", ConnectionString);
        builder.UseSetting("Jwt:Secret", new string('x', 64));
        builder.UseSetting("Admin:Email", AdminEmail);
        builder.UseSetting("Admin:Password", AdminPassword);
        builder.UseSetting("Payments:Provider", "Fake");
        builder.UseSetting("Payments:ApiPublicUrl", "http://localhost");
        builder.UseSetting("Cors:Origins:0", "http://frontend.test");
        builder.UseSetting("Storage:Provider", "Local");
    }

    /// <summary>A context on the test database; starts the app first so migrations have run.</summary>
    public AppDbContext CreateDbContext()
    {
        _ = Services;
        var options = new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(ConnectionString).Options;
        return new AppDbContext(options);
    }

    /// <summary>Drops and recreates the database, then reapplies migrations and seed.</summary>
    public async Task ResetDatabaseAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Npgsql.NpgsqlConnection.ClearAllPools();
        await db.Database.EnsureDeletedAsync();
        await db.Database.MigrateAsync();
        await DbSeeder.SeedAsync(db, scope.ServiceProvider.GetRequiredService<IConfiguration>(), CancellationToken.None);
    }

    public Task InitializeAsync() => _db.StartAsync();

    public new async Task DisposeAsync()
    {
        await base.DisposeAsync();
        await _db.DisposeAsync();
    }
}
