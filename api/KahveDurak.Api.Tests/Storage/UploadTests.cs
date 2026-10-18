using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using KahveDurak.Api.Features.Storage;
using KahveDurak.Api.Tests.Infrastructure;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;

namespace KahveDurak.Api.Tests.Storage;

[Collection("postgres")]
public class UploadTests(ApiFactory factory)
{
    private static MultipartFormDataContent Form(byte[] bytes, string fileName, string contentType = "image/jpeg")
    {
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        return new MultipartFormDataContent { { file, "file", fileName } };
    }

    private string[] UploadedFiles()
    {
        var dir = LocalFileStorage.UploadsDirectory(factory.Services.GetRequiredService<IWebHostEnvironment>());
        return Directory.Exists(dir) ? Directory.GetFiles(dir) : [];
    }

    [Fact]
    public async Task Admin_uploads_png_and_it_is_served()
    {
        var admin = await TestData.AdminAsync(factory);
        var png = ImageSnifferTests.Png.Concat(new byte[100]).ToArray();

        var response = await admin.PostAsync("/api/admin/uploads", Form(png, "foto.jpg", "image/jpeg"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var url = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("url").GetString()!;
        Assert.Matches(@"^http://localhost/uploads/[0-9a-f]{32}\.png$", url);
        var served = await factory.CreateClient().GetAsync(new Uri(url).AbsolutePath);
        Assert.Equal(HttpStatusCode.OK, served.StatusCode);
        Assert.Equal(png, await served.Content.ReadAsByteArrayAsync());
    }

    [Theory]
    [InlineData("MZ\u0090\0\u0003\0\0\0\u0004\0\0\0", "photo.jpg")]
    [InlineData("<svg xmlns=\"http://www.w3.org/2000/svg\"><script>alert(1)</script></svg>", "logo.svg")]
    public async Task Non_images_are_rejected_and_nothing_is_saved(string content, string fileName)
    {
        var admin = await TestData.AdminAsync(factory);
        var before = UploadedFiles().Length;

        var response = await admin.PostAsync("/api/admin/uploads", Form(Encoding.Latin1.GetBytes(content), fileName));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("JPG, PNG ya da WebP", await response.Content.ReadAsStringAsync());
        Assert.Equal(before, UploadedFiles().Length);
    }

    [Fact]
    public async Task Six_megabyte_file_is_rejected()
    {
        var admin = await TestData.AdminAsync(factory);
        var big = ImageSnifferTests.Jpeg.Concat(new byte[6 * 1024 * 1024]).ToArray();

        var response = await admin.PostAsync("/api/admin/uploads", Form(big, "big.jpg"));

        Assert.True(response.StatusCode is HttpStatusCode.BadRequest or HttpStatusCode.RequestEntityTooLarge);
    }

    [Fact]
    public async Task Missing_file_is_400()
    {
        var admin = await TestData.AdminAsync(factory);

        var response = await admin.PostAsync("/api/admin/uploads", new MultipartFormDataContent());

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Customer_gets_403()
    {
        var (_, customer) = await TestData.CustomerAsync(factory);

        var response = await customer.PostAsync("/api/admin/uploads", Form(ImageSnifferTests.Png, "a.png", "image/png"));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
