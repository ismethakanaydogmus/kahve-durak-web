using KahveDurak.Api.Data.Entities;
using KahveDurak.Api.Features.Shop;

namespace KahveDurak.Api.Features.Catalog;

public static class CatalogMapping
{
    public static ProductDto ToDto(this Product p) => new(
        p.Id, p.CategoryId, p.NameTr, p.NameEn, p.DescriptionTr, p.DescriptionEn, p.Price, p.ImageUrl,
        p.IsAvailable, p.IsFeatured,
        p.OptionGroups.OrderBy(g => g.SortOrder).Select(g => new OptionGroupDto(
            g.Id, g.NameTr, g.NameEn, g.IsRequired, g.MinSelect, g.MaxSelect,
            g.Options.OrderBy(o => o.SortOrder).Select(o => new OptionDto(o.Id, o.NameTr, o.NameEn, o.PriceDelta)).ToList()
        )).ToList());

    public static MenuCategoryDto ToDto(this Category c, bool withProducts = true) => new(
        c.Id, c.NameTr, c.NameEn, c.ImageUrl,
        withProducts ? c.Products.OrderBy(p => p.SortOrder).Select(p => p.ToDto()).ToList() : []);

    public static SlideDto ToDto(this Slide s) => new(s.Id, s.TitleTr, s.TitleEn, s.SubtitleTr, s.SubtitleEn, s.ImageUrl, s.LinkUrl);

    public static TestimonialDto ToDto(this Testimonial t) => new(t.Id, t.AuthorName, t.Text, t.Rating);

    public static OpeningHourDto ToDto(this OpeningHour h) =>
        new((int)h.Day, h.Opens.ToString("HH:mm"), h.Closes.ToString("HH:mm"), h.IsClosed);

    public static ShopStatusDto ToDto(this ShopStatus s) => new(s.IsOpen, s.ClosesAt, s.NextOpensAt);
}
