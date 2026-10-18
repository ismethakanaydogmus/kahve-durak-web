using KahveDurak.Api.Data;
using KahveDurak.Api.Data.Entities;
using KahveDurak.Api.Data.Seed;
using KahveDurak.Api.Features.Admin;
using KahveDurak.Api.Features.Auth;
using KahveDurak.Api.Features.Payments;
using KahveDurak.Api.Features.Realtime;
using KahveDurak.Api.Features.Storage;
using Microsoft.Extensions.FileProviders;
using KahveDurak.Api.Features.Shop;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Fail fast: a deploy without a signing key must not look healthy.
_ = JwtTokenService.SigningKey(builder.Configuration);

builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));
builder.Services.AddOpenApi();
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddScoped<ShopInfoQuery>();
builder.Services.AddScoped<JwtTokenService>();
builder.Services.AddScoped<KahveDurak.Api.Features.Orders.CheckoutService>();
AddPayments(builder);
AddStorage(builder);
builder.Services.AddScoped<PaymentCallbackHandler>();
builder.Services.AddSignalR()
    .AddJsonProtocol(o => o.PayloadSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));
builder.Services.AddSingleton<IOrderNotifier, SignalROrderNotifier>();
builder.Services.AddScoped<DashboardQuery>();
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();
builder.Services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
    .Configure<IConfiguration, TimeProvider>((options, config, clock) =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidIssuer = JwtTokenService.Issuer,
            ValidAudience = JwtTokenService.Audience,
            IssuerSigningKey = JwtTokenService.SigningKey(config),
            NameClaimType = JwtRegisteredClaimNames.Sub,
            RoleClaimType = "role",
            // Validate lifetime against the same clock that issued the token (JwtTokenService uses TimeProvider).
            LifetimeValidator = (notBefore, expires, _, p) =>
            {
                var now = clock.GetUtcNow().UtcDateTime;
                // A token without exp is rejected, as the default validator does.
                return expires is not null
                    && (notBefore is null || notBefore.Value - p.ClockSkew <= now)
                    && now < expires.Value + p.ClockSkew;
            },
        };
        options.Events = new JwtBearerEvents
        {
            // SignalR sends the token as a query parameter (used from Plan 3).
            OnMessageReceived = context =>
            {
                var token = context.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(token) && context.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                    context.Token = token;
                return Task.CompletedTask;
            },
        };
    });
builder.Services.AddAuthorizationBuilder()
    .AddPolicy(AuthPolicies.Admin, policy => policy.RequireRole(Roles.Admin));

var corsOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? [];
builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy
    .WithOrigins(corsOrigins)
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()));

var app = builder.Build();

// On Render the app sits behind a proxy: take the client IP and scheme from the last X-Forwarded-* hop.
// Off by default so a directly reachable server can't be fed a spoofed client IP.
if (app.Configuration.GetValue<bool>("Proxy:TrustForwardedHeaders"))
{
    var forwarded = new ForwardedHeadersOptions
    {
        ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto,
        ForwardLimit = 1,
    };
    forwarded.KnownIPNetworks.Clear();
    forwarded.KnownProxies.Clear();
    app.UseForwardedHeaders(forwarded);
}

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    await DbSeeder.SeedAsync(db, app.Configuration, CancellationToken.None, app.Logger);
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

if (app.Services.GetRequiredService<Microsoft.Extensions.Options.IOptions<StorageOptions>>().Value.Provider == StorageOptions.Local)
{
    var uploads = LocalFileStorage.UploadsDirectory(app.Environment);
    Directory.CreateDirectory(uploads);
    app.UseStaticFiles(new StaticFileOptions { FileProvider = new PhysicalFileProvider(uploads), RequestPath = "/uploads" });
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => "ok");
app.MapControllers();
// Group membership is decided at connect time, so a connection must not outlive the token it was opened with.
app.MapHub<OrdersHub>("/hubs/orders", o => o.CloseOnAuthenticationExpiration = true);

app.Run();

// Fake is for local development and tests only; Iyzico must have keys. Both fail at startup, not at checkout.
static void AddPayments(WebApplicationBuilder builder)
{
    var config = builder.Configuration;
    builder.Services.Configure<PaymentOptions>(config.GetSection("Payments"));
    builder.Services.PostConfigure<PaymentOptions>(o =>
    {
        if (string.IsNullOrEmpty(o.FrontendUrl)) o.FrontendUrl = config.GetSection("Cors:Origins").Get<string[]>()?.FirstOrDefault() ?? "";
    });
    builder.Services.Configure<IyzicoOptions>(config.GetSection("Iyzico"));

    var isLocal = builder.Environment.IsDevelopment() || builder.Environment.IsEnvironment("Testing");
    if (!isLocal)
    {
        // iyzico posts back to ApiPublicUrl and customers return to FrontendUrl; a relative or plain-http
        // value would break every payment after the customer has paid.
        var frontend = config["Payments:FrontendUrl"];
        if (string.IsNullOrEmpty(frontend)) frontend = config.GetSection("Cors:Origins").Get<string[]>()?.FirstOrDefault();
        foreach (var (key, value) in new[] { ("Payments:ApiPublicUrl", config["Payments:ApiPublicUrl"]), ("Payments:FrontendUrl", frontend) })
        {
            if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps)
                throw new InvalidOperationException($"{key} must be an absolute https URL outside Development (got '{value}').");
        }
    }

    var provider = config["Payments:Provider"] ?? PaymentOptions.Iyzico;
    if (provider == PaymentOptions.Fake)
    {
        if (!builder.Environment.IsDevelopment() && !builder.Environment.IsEnvironment("Testing"))
            throw new InvalidOperationException("Payments:Provider=Fake is only allowed in Development and Testing.");
        builder.Services.AddSingleton<FakePaymentGateway>();
        builder.Services.AddSingleton<IPaymentGateway>(sp => sp.GetRequiredService<FakePaymentGateway>());
    }
    else if (provider == PaymentOptions.Iyzico)
    {
        if (string.IsNullOrEmpty(config["Iyzico:ApiKey"]) || string.IsNullOrEmpty(config["Iyzico:SecretKey"]))
            throw new InvalidOperationException("Iyzico:ApiKey and Iyzico:SecretKey must be configured (or set Payments:Provider=Fake in Development).");
        builder.Services.AddScoped<IPaymentGateway, IyzicoPaymentGateway>();
    }
    else
    {
        throw new InvalidOperationException($"Unknown Payments:Provider '{provider}'.");
    }
}

// Local disk is for development only: Render wipes it on every deploy, so production must use Supabase.
static void AddStorage(WebApplicationBuilder builder)
{
    var config = builder.Configuration;
    var isLocalEnv = builder.Environment.IsDevelopment() || builder.Environment.IsEnvironment("Testing");
    builder.Services.Configure<StorageOptions>(config.GetSection("Storage"));
    builder.Services.PostConfigure<StorageOptions>(o =>
    {
        if (string.IsNullOrEmpty(config["Storage:Provider"])) o.Provider = isLocalEnv ? StorageOptions.Local : StorageOptions.Supabase;
    });
    var provider = config["Storage:Provider"] is { Length: > 0 } p ? p : (isLocalEnv ? StorageOptions.Local : StorageOptions.Supabase);

    if (provider == StorageOptions.Local)
    {
        if (!isLocalEnv) throw new InvalidOperationException("Storage:Provider=Local is only allowed in Development and Testing.");
        builder.Services.AddSingleton<IFileStorage, LocalFileStorage>();
    }
    else if (provider == StorageOptions.Supabase)
    {
        if (!Uri.TryCreate(config["Storage:SupabaseUrl"], UriKind.Absolute, out var url) || url.Scheme != Uri.UriSchemeHttps)
            throw new InvalidOperationException("Storage:SupabaseUrl must be an absolute https URL.");
        if (string.IsNullOrEmpty(config["Storage:SupabaseServiceKey"]))
            throw new InvalidOperationException("Storage:SupabaseServiceKey must be configured.");
        if (config["Storage:Bucket"] is { } bucket && string.IsNullOrWhiteSpace(bucket))
            throw new InvalidOperationException("Storage:Bucket must not be empty (default: images).");
        builder.Services.AddHttpClient<IFileStorage, SupabaseFileStorage>();
    }
    else
    {
        throw new InvalidOperationException($"Unknown Storage:Provider '{provider}'.");
    }
}

public partial class Program;
