using KahveDurak.Api.Data;
using KahveDurak.Api.Data.Entities;
using KahveDurak.Api.Features.Admin.Catalog;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KahveDurak.Api.Features.Admin.Content;

/// <summary>Home page slider and guest reviews.</summary>
[ApiController]
[Authorize(Policy = AuthPolicies.Admin)]
[Route("api/admin")]
public class AdminContentController(AppDbContext db) : ControllerBase
{
    [HttpGet("slides")]
    public async Task<List<AdminSlideDto>> Slides(CancellationToken ct) =>
        (await db.Slides.AsNoTracking().OrderBy(s => s.SortOrder).ThenBy(s => s.Id).ToListAsync(ct)).Select(AdminSlideDto.From).ToList();

    [HttpPost("slides")]
    public async Task<IActionResult> CreateSlide(SlideRequest request, IValidator<SlideRequest> validator, CancellationToken ct)
    {
        if (await Invalid(validator, request, ct) is { } problem) return problem;
        var slide = new Slide
        {
            TitleTr = request.TitleTr, ImageUrl = request.ImageUrl,
            SortOrder = (await db.Slides.MaxAsync(s => (int?)s.SortOrder, ct) ?? 0) + 1,
        };
        Apply(slide, request);
        db.Slides.Add(slide);
        await db.SaveChangesAsync(ct);
        return StatusCode(StatusCodes.Status201Created, AdminSlideDto.From(slide));
    }

    [HttpPut("slides/{id:int}")]
    public async Task<IActionResult> UpdateSlide(int id, SlideRequest request, IValidator<SlideRequest> validator, CancellationToken ct)
    {
        var slide = await db.Slides.SingleOrDefaultAsync(s => s.Id == id, ct);
        if (slide is null) return NotFound();
        if (await Invalid(validator, request, ct) is { } problem) return problem;
        Apply(slide, request);
        await db.SaveChangesAsync(ct);
        return Ok(AdminSlideDto.From(slide));
    }

    [HttpDelete("slides/{id:int}")]
    public async Task<IActionResult> DeleteSlide(int id, CancellationToken ct) =>
        await db.Slides.Where(s => s.Id == id).ExecuteDeleteAsync(ct) == 0 ? NotFound() : NoContent();

    [HttpPost("slides/reorder")]
    public async Task<IActionResult> ReorderSlides(ReorderRequest request, CancellationToken ct)
    {
        var slides = await db.Slides.ToListAsync(ct);
        if (!IsPermutation(request.Ids, slides.Select(s => s.Id))) return Problem(statusCode: 400, title: "Sıralama bütün slaytları bir kez içermeli.");
        foreach (var s in slides) s.SortOrder = Array.IndexOf(request.Ids, s.Id) + 1;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpGet("testimonials")]
    public async Task<List<AdminTestimonialDto>> Testimonials(CancellationToken ct) =>
        (await db.Testimonials.AsNoTracking().OrderBy(t => t.SortOrder).ThenBy(t => t.Id).ToListAsync(ct)).Select(AdminTestimonialDto.From).ToList();

    [HttpPost("testimonials")]
    public async Task<IActionResult> CreateTestimonial(TestimonialRequest request, IValidator<TestimonialRequest> validator, CancellationToken ct)
    {
        if (await Invalid(validator, request, ct) is { } problem) return problem;
        var testimonial = new Testimonial
        {
            AuthorName = request.AuthorName, Text = request.Text,
            SortOrder = (await db.Testimonials.MaxAsync(t => (int?)t.SortOrder, ct) ?? 0) + 1,
        };
        Apply(testimonial, request);
        db.Testimonials.Add(testimonial);
        await db.SaveChangesAsync(ct);
        return StatusCode(StatusCodes.Status201Created, AdminTestimonialDto.From(testimonial));
    }

    [HttpPut("testimonials/{id:int}")]
    public async Task<IActionResult> UpdateTestimonial(int id, TestimonialRequest request, IValidator<TestimonialRequest> validator, CancellationToken ct)
    {
        var testimonial = await db.Testimonials.SingleOrDefaultAsync(t => t.Id == id, ct);
        if (testimonial is null) return NotFound();
        if (await Invalid(validator, request, ct) is { } problem) return problem;
        Apply(testimonial, request);
        await db.SaveChangesAsync(ct);
        return Ok(AdminTestimonialDto.From(testimonial));
    }

    [HttpDelete("testimonials/{id:int}")]
    public async Task<IActionResult> DeleteTestimonial(int id, CancellationToken ct) =>
        await db.Testimonials.Where(t => t.Id == id).ExecuteDeleteAsync(ct) == 0 ? NotFound() : NoContent();

    [HttpPost("testimonials/reorder")]
    public async Task<IActionResult> ReorderTestimonials(ReorderRequest request, CancellationToken ct)
    {
        var items = await db.Testimonials.ToListAsync(ct);
        if (!IsPermutation(request.Ids, items.Select(t => t.Id))) return Problem(statusCode: 400, title: "Sıralama bütün yorumları bir kez içermeli.");
        foreach (var t in items) t.SortOrder = Array.IndexOf(request.Ids, t.Id) + 1;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static void Apply(Slide s, SlideRequest r)
    {
        s.TitleTr = r.TitleTr.Trim();
        s.TitleEn = r.TitleEn.Clean();
        s.SubtitleTr = r.SubtitleTr.Clean();
        s.SubtitleEn = r.SubtitleEn.Clean();
        s.ImageUrl = r.ImageUrl.Trim();
        s.LinkUrl = r.LinkUrl.Clean();
        s.IsActive = r.IsActive;
    }

    private static void Apply(Testimonial t, TestimonialRequest r)
    {
        t.AuthorName = r.AuthorName.Trim();
        t.Text = r.Text.Trim();
        t.Rating = r.Rating;
        t.IsPublished = r.IsPublished;
    }

    private static bool IsPermutation(int[]? ids, IEnumerable<int> existing)
    {
        var set = existing.ToHashSet();
        return ids is not null && ids.Length == set.Count && ids.Distinct().Count() == ids.Length && ids.All(set.Contains);
    }

    private async Task<IActionResult?> Invalid<T>(IValidator<T> validator, T request, CancellationToken ct)
    {
        var result = await validator.ValidateAsync(request, ct);
        return result.IsValid ? null : ValidationProblem(new ValidationProblemDetails(result.ToDictionary()));
    }
}
