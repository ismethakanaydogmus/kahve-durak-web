using System.Text.RegularExpressions;
using FluentValidation;

namespace KahveDurak.Api.Features.Auth;

public static partial class PhoneNormalizer
{
    public static string Normalize(string? phone) => WhitespaceOrDash().Replace(phone ?? "", "");

    public static bool IsValid(string? phone) => Valid().IsMatch(Normalize(phone));

    [GeneratedRegex(@"[\s\-()]")]
    private static partial Regex WhitespaceOrDash();

    [GeneratedRegex(@"^\+?\d{10,13}$")]
    private static partial Regex Valid();
}

public class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator()
    {
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(64);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(64);
        RuleFor(x => x.Email).NotEmpty().MaximumLength(256)
            .Must(e => new System.ComponentModel.DataAnnotations.EmailAddressAttribute().IsValid(EmailNormalizer.Normalize(e)))
            .WithMessage("Geçerli bir e-posta adresi girin.");
        RuleFor(x => x.Phone).NotEmpty().Must(PhoneNormalizer.IsValid).WithMessage("Geçerli bir telefon numarası girin.");
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8).MaximumLength(128);
    }
}

public class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty();
        RuleFor(x => x.Password).NotEmpty();
    }
}
