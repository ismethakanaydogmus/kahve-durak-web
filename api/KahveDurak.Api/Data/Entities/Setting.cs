namespace KahveDurak.Api.Data.Entities;

public class Setting
{
    public required string Key { get; set; }
    public required string Value { get; set; }
}

public static class SettingKeys
{
    public const string DeliveryFee = "DeliveryFee";
    public const string MinOrderAmount = "MinOrderAmount";
    public const string ShopPhone = "ShopPhone";
    public const string ShopAddress = "ShopAddress";
    public const string MapEmbedUrl = "MapEmbedUrl";
}
