namespace KahveDurak.Api.Features.Storage;

public enum ImageKind { Jpeg, Png, Webp }

/// <summary>Identifies an image by its first bytes, never by the name or content type the client claims.</summary>
public static class ImageSniffer
{
    public const int HeadLength = 12;

    public static ImageKind? Detect(ReadOnlySpan<byte> head)
    {
        if (head.StartsWith((ReadOnlySpan<byte>)[0xFF, 0xD8, 0xFF])) return ImageKind.Jpeg;
        if (head.StartsWith((ReadOnlySpan<byte>)[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) return ImageKind.Png;
        if (head.Length >= 12 && head[..4].SequenceEqual("RIFF"u8) && head[8..12].SequenceEqual("WEBP"u8)) return ImageKind.Webp;
        return null;
    }

    public static string Extension(ImageKind kind) => kind switch
    {
        ImageKind.Jpeg => ".jpg",
        ImageKind.Png => ".png",
        _ => ".webp",
    };

    public static string ContentType(ImageKind kind) => kind switch
    {
        ImageKind.Jpeg => "image/jpeg",
        ImageKind.Png => "image/png",
        _ => "image/webp",
    };
}
