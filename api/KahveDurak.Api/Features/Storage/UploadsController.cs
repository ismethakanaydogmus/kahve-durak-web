using KahveDurak.Api.Features.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KahveDurak.Api.Features.Storage;

public record UploadResponse(string Url);

[ApiController]
[Authorize(Policy = AuthPolicies.Admin)]
[Route("api/admin/uploads")]
public class UploadsController(IFileStorage storage) : ControllerBase
{
    public const long MaxBytes = 5 * 1024 * 1024;

    [HttpPost]
    [RequestSizeLimit(6_000_000)]
    [RequestFormLimits(MultipartBodyLengthLimit = 6_000_000)]
    public async Task<IActionResult> Upload(IFormFile? file, CancellationToken ct)
    {
        if (file is null || file.Length == 0) return Problem(statusCode: 400, title: "Bir görsel seç.");
        if (file.Length > MaxBytes) return Problem(statusCode: 400, title: "Görsel en fazla 5 MB olabilir.");

        // Trust the bytes, not the file name or the content type the browser sent.
        var head = new byte[ImageSniffer.HeadLength];
        int read;
        await using (var peek = file.OpenReadStream())
            read = await peek.ReadAtLeastAsync(head, head.Length, throwOnEndOfStream: false, ct);
        if (ImageSniffer.Detect(head.AsSpan(0, read)) is not { } kind)
            return Problem(statusCode: 400, title: "Sadece JPG, PNG ya da WebP yükleyebilirsin.");

        var name = $"{Guid.NewGuid():N}{ImageSniffer.Extension(kind)}";
        await using var content = file.OpenReadStream();
        var url = await storage.SaveAsync(content, name, ImageSniffer.ContentType(kind), ct);
        return StatusCode(StatusCodes.Status201Created, new UploadResponse(url));
    }
}
