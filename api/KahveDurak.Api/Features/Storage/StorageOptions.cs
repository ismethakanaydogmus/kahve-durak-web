namespace KahveDurak.Api.Features.Storage;

/// <summary>Bound from the "Storage" config section.</summary>
public class StorageOptions
{
    public const string Local = "Local";
    public const string Supabase = "Supabase";

    /// <summary>Local (wwwroot/uploads, Development/Testing only) or Supabase (public bucket).</summary>
    public string Provider { get; set; } = Local;
    public string SupabaseUrl { get; set; } = "";
    public string SupabaseServiceKey { get; set; } = "";
    public string Bucket { get; set; } = "images";
}
