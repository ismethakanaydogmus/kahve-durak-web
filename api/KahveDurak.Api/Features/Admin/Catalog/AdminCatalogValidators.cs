using FluentValidation;

namespace KahveDurak.Api.Features.Admin.Catalog;

public class CategoryRequestValidator : AbstractValidator<CategoryRequest>
{
    public CategoryRequestValidator()
    {
        RuleFor(x => x.NameTr).NotEmpty().MaximumLength(60);
        RuleFor(x => x.NameEn).MaximumLength(60);
        RuleFor(x => x.ImageUrl).MaximumLength(500);
    }
}

public class ProductRequestValidator : AbstractValidator<ProductRequest>
{
    public const decimal MaxPrice = 100_000m;

    public ProductRequestValidator()
    {
        RuleFor(x => x.CategoryId).GreaterThan(0);
        RuleFor(x => x.NameTr).NotEmpty().MaximumLength(60);
        RuleFor(x => x.NameEn).MaximumLength(60);
        RuleFor(x => x.DescriptionTr).MaximumLength(200);
        RuleFor(x => x.DescriptionEn).MaximumLength(200);
        RuleFor(x => x.ImageUrl).MaximumLength(500);
        // iyzico rejects basket items priced at 0, so a product must cost something.
        RuleFor(x => x.Price).GreaterThan(0).WithMessage("Fiyat 0'dan büyük olmalı.").LessThanOrEqualTo(MaxPrice);
        RuleFor(x => x.OptionGroups).NotNull().Must(g => g.Length <= 10).WithMessage("En fazla 10 seçenek grubu olabilir.");
        RuleForEach(x => x.OptionGroups).ChildRules(group =>
        {
            group.RuleFor(g => g.NameTr).NotEmpty().MaximumLength(60);
            group.RuleFor(g => g.NameEn).MaximumLength(60);
            group.RuleFor(g => g.Options).NotNull()
                .Must(o => o.Length is >= 1 and <= 20).WithMessage("Her grupta 1 ile 20 arasında seçenek olmalı.");
            group.RuleFor(g => g.MaxSelect)
                .Must((g, max) => max >= 1 && max <= (g.Options?.Length ?? 0))
                .WithMessage("En fazla seçim sayısı 1 ile seçenek sayısı arasında olmalı.");
            group.RuleForEach(g => g.Options).ChildRules(option =>
            {
                option.RuleFor(o => o.NameTr).NotEmpty().MaximumLength(60);
                option.RuleFor(o => o.NameEn).MaximumLength(60);
                option.RuleFor(o => o.PriceDelta).GreaterThanOrEqualTo(0).WithMessage("Fiyat farkı negatif olamaz.").LessThanOrEqualTo(MaxPrice);
            });
        });
    }
}
