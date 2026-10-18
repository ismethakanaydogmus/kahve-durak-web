namespace KahveDurak.Api.Features.Storage;

public interface IFileStorage
{
    /// <summary>Stores the file and returns its absolute public URL.</summary>
    Task<string> SaveAsync(Stream content, string fileName, string contentType, CancellationToken ct);
}
