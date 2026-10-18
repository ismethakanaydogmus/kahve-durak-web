using System.Net;
using System.Text;
using KahveDurak.Api.Features.Storage;
using KahveDurak.Api.Tests.Infrastructure;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Options;

namespace KahveDurak.Api.Tests.Storage;

public class ImageSnifferTests
{
    public static readonly byte[] Png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 13];
    public static readonly byte[] Jpeg = [0xFF, 0xD8, 0xFF, 0xE0, 0, 16, 0x4A, 0x46, 0x49, 0x46, 0, 1];
    public static readonly byte[] Webp = [.. "RIFF"u8, 0x24, 0, 0, 0, .. "WEBP"u8];

    [Fact]
    public void Detects_png_jpeg_and_webp()
    {
        Assert.Equal(ImageKind.Png, ImageSniffer.Detect(Png));
        Assert.Equal(ImageKind.Jpeg, ImageSniffer.Detect(Jpeg));
        Assert.Equal(ImageKind.Webp, ImageSniffer.Detect(Webp));
        Assert.Equal(".webp", ImageSniffer.Extension(ImageKind.Webp));
        Assert.Equal("image/jpeg", ImageSniffer.ContentType(ImageKind.Jpeg));
    }

    [Theory]
    [InlineData("GIF89a\0\0\0\0\0\0")]
    [InlineData("<svg xmlns=\"http://www.w3.org/2000/svg\">")]
    [InlineData("MZ\u0090\0\u0003\0\0\0\u0004\0\0\0")]
    [InlineData("RIFF\0\0\0\0WAVE")]
    [InlineData("")]
    public void Rejects_everything_else(string head)
    {
        Assert.Null(ImageSniffer.Detect(Encoding.Latin1.GetBytes(head)));
    }
}

public class SupabaseFileStorageTests
{
    private sealed class Recorder(HttpStatusCode status) : HttpMessageHandler
    {
        public HttpRequestMessage? Request;
        public byte[]? Body;

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Request = request;
            Body = request.Content is null ? null : await request.Content.ReadAsByteArrayAsync(ct);
            return new HttpResponseMessage(status) { Content = new StringContent("{}") };
        }
    }

    private static SupabaseFileStorage Storage(Recorder handler, string key = "service-key") => new(
        new HttpClient(handler),
        Options.Create(new StorageOptions { Provider = "Supabase", SupabaseUrl = "https://abc.supabase.co", SupabaseServiceKey = key, Bucket = "images" }));

    [Fact]
    public async Task New_secret_keys_go_only_in_the_apikey_header()
    {
        var handler = new Recorder(HttpStatusCode.OK);

        await Storage(handler, "sb_secret_abc").SaveAsync(new MemoryStream(ImageSnifferTests.Png), "a.png", "image/png", default);

        Assert.Equal("sb_secret_abc", handler.Request!.Headers.GetValues("apikey").Single());
        Assert.Null(handler.Request.Headers.Authorization);
    }

    [Fact]
    public async Task Uploads_with_service_key_and_returns_public_url()
    {
        var handler = new Recorder(HttpStatusCode.OK);

        var url = await Storage(handler).SaveAsync(new MemoryStream(ImageSnifferTests.Png), "abc.png", "image/png", default);

        Assert.Equal(HttpMethod.Post, handler.Request!.Method);
        Assert.Equal("https://abc.supabase.co/storage/v1/object/images/abc.png", handler.Request.RequestUri!.ToString());
        Assert.Equal("Bearer service-key", handler.Request.Headers.Authorization!.ToString());
        Assert.Equal("service-key", handler.Request.Headers.GetValues("apikey").Single());
        Assert.Equal("false", handler.Request.Headers.GetValues("x-upsert").Single());
        Assert.Equal("image/png", handler.Request.Content!.Headers.ContentType!.MediaType);
        Assert.Equal(ImageSnifferTests.Png, handler.Body);
        Assert.Equal("https://abc.supabase.co/storage/v1/object/public/images/abc.png", url);
    }

    [Fact]
    public async Task Failed_upload_throws()
    {
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            Storage(new Recorder(HttpStatusCode.BadRequest)).SaveAsync(new MemoryStream(ImageSnifferTests.Png), "a.png", "image/png", default));
    }
}

[Collection("postgres")]
public class StorageConfigTests(ApiFactory factory)
{
    private static Action<IWebHostBuilder> Production(string provider, string url = "https://abc.supabase.co", string key = "k") => b =>
    {
        b.UseEnvironment("Production");
        b.UseSetting("Payments:Provider", "Iyzico");
        b.UseSetting("Iyzico:ApiKey", "key");
        b.UseSetting("Iyzico:SecretKey", "secret");
        b.UseSetting("Payments:ApiPublicUrl", "https://api.example");
        b.UseSetting("Payments:FrontendUrl", "https://kahvedurak.example");
        b.UseSetting("Storage:Provider", provider == "SupabaseNoBucket" ? "Supabase" : provider);
        if (provider == "SupabaseNoBucket") b.UseSetting("Storage:Bucket", " ");
        b.UseSetting("Storage:SupabaseUrl", url);
        b.UseSetting("Storage:SupabaseServiceKey", key);
    };

    [Theory]
    [InlineData("Local", "https://abc.supabase.co", "k")]
    [InlineData("Supabase", "", "k")]
    [InlineData("Supabase", "http://abc.supabase.co", "k")]
    [InlineData("Supabase", "https://abc.supabase.co", "")]
    [InlineData("SupabaseNoBucket", "https://abc.supabase.co", "k")]
    public void Production_rejects_unsafe_storage_config(string provider, string url, string key)
    {
        var error = Assert.ThrowsAny<Exception>(() => factory.WithWebHostBuilder(Production(provider, url, key)).CreateClient());

        Assert.Contains("Storage:", error.ToString());
    }

    [Fact]
    public void Production_starts_with_supabase()
    {
        using var client = factory.WithWebHostBuilder(Production("Supabase")).CreateClient();

        Assert.NotNull(client);
    }
}
