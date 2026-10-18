using System.Net.Http.Headers;
using Microsoft.Extensions.Options;

namespace KahveDurak.Api.Features.Storage;

/// <summary>Production: Supabase Storage REST API, public bucket. Render's disk is wiped on every deploy.</summary>
public class SupabaseFileStorage(HttpClient http, IOptions<StorageOptions> options) : IFileStorage
{
    public async Task<string> SaveAsync(Stream content, string fileName, string contentType, CancellationToken ct)
    {
        var o = options.Value;
        var baseUrl = o.SupabaseUrl.TrimEnd('/');
        using var request = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/storage/v1/object/{o.Bucket}/{fileName}")
        {
            Content = new StreamContent(content),
        };
        request.Content.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        request.Headers.Add("apikey", o.SupabaseServiceKey);
        // New sb_secret_ keys are not JWTs and must not go in Authorization; legacy service_role JWTs need both.
        if (!o.SupabaseServiceKey.StartsWith("sb_", StringComparison.Ordinal))
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", o.SupabaseServiceKey);
        request.Headers.Add("x-upsert", "false");

        using var response = await http.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"Supabase upload failed: {(int)response.StatusCode} {await response.Content.ReadAsStringAsync(ct)}");
        return $"{baseUrl}/storage/v1/object/public/{o.Bucket}/{fileName}";
    }
}
