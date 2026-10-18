using FluentValidation;

namespace KahveDurak.Api.Features.Addresses;

public class AddressRequestValidator : AbstractValidator<AddressRequest>
{
    public AddressRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(40);
        RuleFor(x => x.NeighborhoodId).GreaterThan(0);
        RuleFor(x => x.Line).NotEmpty().Must(l => l.Trim().Length >= 5).WithMessage("Adres en az 5 karakter olmalı.").MaximumLength(200);
        RuleFor(x => x.Directions).MaximumLength(200);
    }
}
