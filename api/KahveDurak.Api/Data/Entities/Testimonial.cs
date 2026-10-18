namespace KahveDurak.Api.Data.Entities;

public class Testimonial
{
    public int Id { get; set; }
    public required string AuthorName { get; set; }
    public required string Text { get; set; }
    public int Rating { get; set; }
    public bool IsPublished { get; set; } = true;
    public int SortOrder { get; set; }
}
