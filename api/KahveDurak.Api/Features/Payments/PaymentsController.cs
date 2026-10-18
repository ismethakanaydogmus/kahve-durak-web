using System.Globalization;
using System.Net;
using KahveDurak.Api.Data.Entities;
using KahveDurak.Api.Features.Orders;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace KahveDurak.Api.Features.Payments;

[ApiController]
[Route("api/payments")]
public class PaymentsController(PaymentCallbackHandler handler, IOptions<PaymentOptions> options) : ControllerBase
{
    /// <summary>
    /// iyzico posts the token here from the customer's browser. No CSRF check: the only thing trusted
    /// is the server-side Retrieve result inside the handler.
    /// </summary>
    [HttpPost("iyzico/callback")]
    [Consumes("application/x-www-form-urlencoded")]
    public async Task<IActionResult> IyzicoCallback([FromForm] string token, CancellationToken ct) =>
        RedirectToFrontend(await handler.HandleAsync(token, ct));

    [HttpGet("fake/{token}")]
    public IActionResult FakePage(string token, [FromServices] IPaymentGateway gateway)
    {
        if (gateway is not FakePaymentGateway fake || fake.AmountFor(token) is not { } amount) return NotFound();
        var price = amount.ToString("C2", CultureInfo.GetCultureInfo("tr-TR"));
        var action = WebUtility.HtmlEncode($"/api/payments/fake/{token}");
        var html = $$"""
            <!doctype html>
            <html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
            <meta name="robots" content="noindex"><title>Test ödemesi</title>
            <style>body{font-family:system-ui,sans-serif;background:#fbf1e6;color:#2e160b;display:grid;place-items:center;min-height:100vh;margin:0}
            main{background:#fffaf4;padding:2rem;border-radius:1.5rem;max-width:22rem;text-align:center}
            button{font:inherit;font-weight:600;border:0;border-radius:999px;padding:.75rem 1.5rem;margin:.25rem;cursor:pointer}
            .ok{background:#5a2a17;color:#fffaf4}.fail{background:#f4d9bc;color:#5a2a17}</style></head>
            <body><main><h1>Test ödemesi: {{price}}</h1>
            <p>Bu sayfa sadece lokal geliştirme içindir. Gerçek ödeme alınmaz.</p>
            <form method="post" action="{{action}}"><button class="ok" name="result" value="success">Ödeme başarılı</button>
            <button class="fail" name="result" value="fail">Ödeme başarısız</button></form></main></body></html>
            """;
        return Content(html, "text/html; charset=utf-8");
    }

    [HttpPost("fake/{token}")]
    [Consumes("application/x-www-form-urlencoded")]
    public async Task<IActionResult> FakeSubmit(string token, [FromForm] string result, [FromServices] IPaymentGateway gateway, CancellationToken ct)
    {
        if (gateway is not FakePaymentGateway fake || fake.AmountFor(token) is null) return NotFound();
        fake.SetOutcome(token, result == "success");
        return RedirectToFrontend(await handler.HandleAsync(token, ct));
    }

    private IActionResult RedirectToFrontend(Order? order)
    {
        var frontend = options.Value.FrontendUrl.TrimEnd('/');
        var target = order is null
            ? $"{frontend}/hesap?odeme=bulunamadi"
            : $"{frontend}/siparis/{order.Id}?odeme={order.Status switch
            {
                OrderStatus.PaymentFailed => "basarisiz",
                // The gateway could not confirm either way yet.
                OrderStatus.PendingPayment => "kontrol",
                _ => "basarili",
            }}";
        return new SeeOtherResult(target);
    }

    /// <summary>303 so the browser follows the POST with a GET.</summary>
    private sealed class SeeOtherResult(string url) : IActionResult
    {
        public Task ExecuteResultAsync(ActionContext context)
        {
            context.HttpContext.Response.StatusCode = StatusCodes.Status303SeeOther;
            context.HttpContext.Response.Headers.Location = url;
            return Task.CompletedTask;
        }
    }
}
