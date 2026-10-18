using KahveDurak.Api.Data.Entities;

namespace KahveDurak.Api.Data.Seed;

/// <summary>Kahve Durak is a fictional café: the address, phone and reviews below are made up for the demo.</summary>
public static class ShopSeed
{
    public const string Address = "Selamiali Mah., Demlik Sk. No:12, Üsküdar/İstanbul";
    public const string Phone = "+90 555 000 0000";

    public static List<OpeningHour> OpeningHours() =>
        Enum.GetValues<DayOfWeek>()
            .Select(d => new OpeningHour { Day = d, Opens = new TimeOnly(10, 0), Closes = new TimeOnly(3, 0) })
            .ToList();

    /// <summary>Delivery fee and minimum order are sample values, editable from the admin panel.</summary>
    public static List<Setting> Settings() =>
    [
        new() { Key = SettingKeys.DeliveryFee, Value = "30" },
        new() { Key = SettingKeys.MinOrderAmount, Value = "200" },
        new() { Key = SettingKeys.ShopPhone, Value = Phone },
        new() { Key = SettingKeys.ShopAddress, Value = Address },
        // The street is made up, so the map shows the district.
        new() { Key = SettingKeys.MapEmbedUrl, Value = "https://www.google.com/maps?q=" + Uri.EscapeDataString("Üsküdar, İstanbul") + "&output=embed" },
    ];

    public static readonly string[] UskudarNeighborhoods =
    [
        "Acıbadem", "Ahmediye", "Altunizade", "Aziz Mahmut Hüdayi", "Bahçelievler", "Barbaros", "Beylerbeyi",
        "Bulgurlu", "Burhaniye", "Cumhuriyet", "Çengelköy", "Ferah", "Güzeltepe", "İcadiye", "Kandilli",
        "Kirazlıtepe", "Kısıklı", "Kuleli", "Kuzguncuk", "Küçük Çamlıca", "Küçüksu", "Küplüce",
        "Mehmet Akif Ersoy", "Mimar Sinan", "Murat Reis", "Salacak", "Selamiali", "Selimiye", "Sultantepe",
        "Ünalan", "Valide-i Atik", "Yavuztürk", "Zeynep Kamil",
    ];

    public static List<Slide> Slides() =>
    [
        new()
        {
            TitleTr = "Mahallenin kahve durağı", TitleEn = "Your neighborhood coffee stop",
            SubtitleTr = "Taze çekirdek, sıcak sohbet; şimdi online.", SubtitleEn = "Fresh beans, warm chats; now online.",
            ImageUrl = "/seed/slide-1.svg", LinkUrl = "/menu", SortOrder = 1
        },
        new()
        {
            TitleTr = "Soğuk kahve sezonu: Cold Brew", TitleEn = "Iced coffee season: Cold Brew",
            SubtitleTr = "16 saat demlendi, buz gibi geldi.", SubtitleEn = "Steeped for 16 hours, served ice-cold.",
            ImageUrl = "/seed/slide-2.svg", LinkUrl = "/menu", SortOrder = 2
        },
        new()
        {
            TitleTr = "Üsküdar'da kapına", TitleEn = "To your door in Üsküdar",
            SubtitleTr = "Üsküdar içinde adrese teslim ya da gel-al.", SubtitleEn = "Delivery across Üsküdar, or pick up.",
            ImageUrl = "/seed/slide-3.svg", LinkUrl = "/menu", SortOrder = 3
        },
        new()
        {
            TitleTr = "Kahven yanında kutu oyunları", TitleEn = "Board games with your coffee",
            SubtitleTr = "Arkadaşlarını topla, oyununu seç, kahven bizden.",
            SubtitleEn = "Bring your friends, pick a game, we'll bring the coffee.",
            ImageUrl = "/seed/slide-4.svg", LinkUrl = "/menu", SortOrder = 4
        },
    ];

    /// <summary>Sample reviews written for the demo; the authors are fictional.</summary>
    public static List<Testimonial> Testimonials() =>
    [
        new() { AuthorName = "Zeynep K.", Rating = 5, SortOrder = 1,
            Text = "Sabah işe giderken uğradığım yer oldu. Latte her seferinde aynı lezzette, çalışanlar da çok güler yüzlü." },
        new() { AuthorName = "Mert A.", Rating = 5, SortOrder = 2,
            Text = "Arkadaşlarla kutu oyunu oynamak için harika bir mekan. Oyun çeşidi bol, kahveler de gayet iyi." },
        new() { AuthorName = "Selin D.", Rating = 5, SortOrder = 3,
            Text = "Online sipariş verdim, yirmi dakikada kapımdaydı. Cold brew buz gibi geldi, çok memnun kaldım." },
        new() { AuthorName = "Burak Y.", Rating = 4, SortOrder = 4,
            Text = "Sakin bir ortamda çalışmak isteyenler için ideal. Akşamları biraz kalabalık oluyor ama değer." },
        new() { AuthorName = "Ayşe N.", Rating = 5, SortOrder = 5,
            Text = "Türk kahvesi tam kıvamında, yanında gelen lokum da ayrı güzel. Fiyatlar da makul." },
        new() { AuthorName = "Can T.", Rating = 5, SortOrder = 6,
            Text = "Yulaf sütlü seçeneklerin olması büyük artı. Karamelli latteyi mutlaka deneyin." },
    ];
}
