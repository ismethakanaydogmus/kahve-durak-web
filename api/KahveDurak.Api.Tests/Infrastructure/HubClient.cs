using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Channels;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.SignalR.Client;

namespace KahveDurak.Api.Tests.Infrastructure;

public static class HubClient
{
    /// <summary>Connects to /hubs/orders on the in-memory test server (long polling, token via query string).</summary>
    public static async Task<HubConnection> ConnectAsync(WebApplicationFactory<Program> app, string? token)
    {
        var connection = new HubConnectionBuilder()
            .WithUrl("http://localhost/hubs/orders", o =>
            {
                o.HttpMessageHandlerFactory = _ => app.Server.CreateHandler();
                o.AccessTokenProvider = () => Task.FromResult(token);
                o.Transports = HttpTransportType.LongPolling;
            })
            .Build();
        await connection.StartAsync();
        return connection;
    }

    /// <summary>Collects every payload of <paramref name="evt"/> as raw JSON.</summary>
    public static ChannelReader<JsonElement> Received(this HubConnection connection, string evt)
    {
        var channel = Channel.CreateUnbounded<JsonElement>();
        connection.On<JsonElement>(evt, payload => channel.Writer.TryWrite(payload));
        return channel.Reader;
    }

    public static async Task<JsonElement?> NextAsync(this ChannelReader<JsonElement> reader, TimeSpan timeout)
    {
        using var cts = new CancellationTokenSource(timeout);
        try
        {
            return await reader.ReadAsync(cts.Token);
        }
        catch (OperationCanceledException)
        {
            return null;
        }
    }

    public static async Task<string> LoginAsync(HttpClient client, string email, string password)
    {
        var response = await client.PostAsJsonAsync("/api/auth/login", new { email, password });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("token").GetString()!;
    }

    public static string TokenOf(HttpClient client) => client.DefaultRequestHeaders.Authorization!.Parameter!;
}
