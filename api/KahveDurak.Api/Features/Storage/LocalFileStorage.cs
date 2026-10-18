using KahveDurak.Api.Features.Payments;
using Microsoft.Extensions.Options;

namespace KahveDurak.Api.Features.Storage;

/// <summary>Development/Testing: files under wwwroot/uploads, served by the API at /uploads.</summary>
public class LocalFileStorage(IWebHostEnvironment env, IOptions<PaymentOptions> payment) : IFileStorage
{
    public static string UploadsDirectory(IWebHostEnvironment env) => Path.Combine(env.ContentRootPath, "wwwroot", "uploads");

    public async Task<string> SaveAsync(Stream content, string fileName, string contentType, CancellationToken ct)
    {
        var dir = UploadsDirectory(env);
        Directory.CreateDirectory(dir);
        await using (var file = File.Create(Path.Combine(dir, fileName)))
            await content.CopyToAsync(file, ct);
        return $"{payment.Value.ApiPublicUrl.TrimEnd('/')}/uploads/{fileName}";
    }
}
