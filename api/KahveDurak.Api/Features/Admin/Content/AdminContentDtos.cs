using KahveDurak.Api.Data.Entities;
using FluentValidation;

namespace KahveDurak.Api.Features.Admin.Content;

public record AdminSlideDto(
    int Id, string TitleTr, string? TitleEn, string? SubtitleTr, string? SubtitleEn, string ImageUrl, string? LinkUrl, bool IsActive)
{
    public static AdminSlideDto From(Slide s) => new(s.Id, s.TitleTr, s.TitleEn, s.SubtitleTr, s.SubtitleEn, s.ImageUrl, s.LinkUrl, s.IsActive);
}

public record SlideRequest(
    string TitleTr, string? TitleEn, string? SubtitleTr, string? SubtitleEn, string ImageUrl, string? LinkUrl, bool IsActive);

public record AdminTestimonialDto(int Id, string AuthorName, string Text, int Rating, bool IsPublished)
{
    public static AdminTestimonialDto From(Testimonial t) => new(t.Id, t.AuthorName, t.Text, t.Rating, t.IsPublished);
}

public record TestimonialRequest(string AuthorName, string Text, int Rating, bool IsPublished);

public class SlideRequestValidator : AbstractValidator<SlideRequest>
{
    public SlideRequestValidator()
    {
        RuleFor(x => x.TitleTr).NotEmpty().MaximumLength(80);
        RuleFor(x => x.TitleEn).MaximumLength(80);
        RuleFor(x => x.SubtitleTr).MaximumLength(140);
        RuleFor(x => x.SubtitleEn).MaximumLength(140);
        RuleFor(x => x.ImageUrl).NotEmpty().WithMessage("Görsel zorunlu.").MaximumLength(500);
        // Slides link inside the site only; an external or protocol-relative link would be an open redirect.
        RuleFor(x => x.LinkUrl)
            .Must(l => string.IsNullOrWhiteSpace(l) || (l.StartsWith('/') && !l.StartsWith("//") && !l.StartsWith("/\\")))
            .WithMessage("Link site içinde olmalı (ör. /menu).")
            .MaximumLength(200);
    }
}

public class TestimonialRequestValidator : AbstractValidator<TestimonialRequest>
{
    public TestimonialRequestValidator()
    {
        RuleFor(x => x.AuthorName).NotEmpty().MaximumLength(40);
        RuleFor(x => x.Text).NotEmpty().MaximumLength(500);
        RuleFor(x => x.Rating).InclusiveBetween(1, 5);
    }
}
