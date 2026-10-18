using KahveDurak.Api.Data.Entities;

namespace KahveDurak.Api.Features.Addresses;

public record AddressRequest(string Title, int NeighborhoodId, string Line, string? Directions);

public record AddressDto(int Id, string Title, int NeighborhoodId, string NeighborhoodName, string Line, string? Directions)
{
    public static AddressDto From(Address a) =>
        new(a.Id, a.Title, a.NeighborhoodId, a.Neighborhood?.Name ?? "", a.Line, a.Directions);
}

public record NeighborhoodDto(int Id, string Name);
