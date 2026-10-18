namespace KahveDurak.Api.Features.Catalog;

public record OptionDto(int Id, string NameTr, string? NameEn, decimal PriceDelta);

public record OptionGroupDto(int Id, string NameTr, string? NameEn, bool IsRequired, int MinSelect, int MaxSelect, List<OptionDto> Options);

public record ProductDto(
    int Id, int CategoryId, string NameTr, string? NameEn, string? DescriptionTr, string? DescriptionEn,
    decimal Price, string? ImageUrl, bool IsAvailable, bool IsFeatured, List<OptionGroupDto> OptionGroups);

public record MenuCategoryDto(int Id, string NameTr, string? NameEn, string? ImageUrl, List<ProductDto> Products);

public record SlideDto(int Id, string TitleTr, string? TitleEn, string? SubtitleTr, string? SubtitleEn, string ImageUrl, string? LinkUrl);

public record TestimonialDto(int Id, string AuthorName, string Text, int Rating);

/// <summary>Day: 0 = Sunday … 6 = Saturday. Times are "HH:mm" Istanbul local.</summary>
public record OpeningHourDto(int Day, string Opens, string Closes, bool IsClosed);

public record ShopStatusDto(bool IsOpen, DateTimeOffset? ClosesAt, DateTimeOffset? NextOpensAt);

public record ShopInfoDto(
    string Name, string Address, string Phone, string MapEmbedUrl, List<OpeningHourDto> OpeningHours,
    ShopStatusDto Status, decimal DeliveryFee, decimal MinOrderAmount);

public record HomeDto(
    List<SlideDto> Slides, List<MenuCategoryDto> Categories, List<ProductDto> Featured,
    List<TestimonialDto> Testimonials, ShopInfoDto Shop);
