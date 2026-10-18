namespace KahveDurak.Api.Data.Entities;

public class Slide
{
    public int Id { get; set; }
    public required string TitleTr { get; set; }
    public string? TitleEn { get; set; }
    public string? SubtitleTr { get; set; }
    public string? SubtitleEn { get; set; }
    public required string ImageUrl { get; set; }
    public string? LinkUrl { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
