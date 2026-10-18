using KahveDurak.Api.Data.Entities;

namespace KahveDurak.Api.Data.Seed;

/// <summary>Sample menu for the fictional Kahve Durak demo: generic drinks, made-up prices and descriptions.</summary>
public static class MenuSeed
{
    private static readonly HashSet<string> Featured =
        ["Latte", "Karamelli Latte", "Türk Kahvesi", "Cold Brew", "Iced Latte", "Limonata"];

    public static List<Category> Build()
    {
        var hot = Cat("Sıcak İçecekler", "Hot Drinks", 1,
            P("Espresso", "Espresso", 95m, "Kısa, yoğun ve kremalı bir shot.", "A short, intense shot with a rich crema.",
                Required("Boy", "Size", ("Single", "Single", 0m), ("Double", "Double", 20m))),
            P("Americano", "Americano", 150m, "Espresso ve sıcak su, sade ve dengeli.", "Espresso and hot water, simple and balanced."),
            P("Filtre Kahve", "Filter Coffee", 150m, "Her sabah taze demlenen günün çekirdeği.", "The bean of the day, brewed fresh every morning."),
            Milky(P("Cortado", "Cortado", 165m, "Espresso ve az miktarda ılık süt.", "Espresso cut with a little warm milk."), withSize: false),
            Milky(P("Flat White", "Flat White", 175m, "Double espresso üzerine ipeksi süt.", "Double espresso under silky milk."), withSize: false),
            Milky(P("Latte", "Latte", 175m, "Bol sütlü, yumuşak içimli klasik.", "The mellow classic with plenty of milk.")),
            Milky(P("Cappuccino", "Cappuccino", 175m, "Espresso, süt ve kalın bir köpük katmanı.", "Espresso, milk and a thick layer of foam.")),
            Milky(P("Karamelli Latte", "Caramel Latte", 190m, "Ev yapımı karamel sosla tatlandırılmış latte.", "Latte sweetened with house-made caramel sauce.")),
            Milky(P("Mocha", "Mocha", 190m, "Bitter çikolata, espresso ve süt.", "Dark chocolate, espresso and milk.")),
            Milky(P("Beyaz Mocha", "White Mocha", 190m, "Beyaz çikolata, espresso ve süt.", "White chocolate, espresso and milk.")),
            P("Türk Kahvesi", "Turkish Coffee", 110m, "Bol köpüklü, yanında lokumla.", "Foamy and served with Turkish delight.",
                Required("Porsiyon", "Portion", ("Tek", "Single", 0m), ("Duble", "Double", 35m))),
            P("Sıcak Çikolata", "Hot Chocolate", 170m, "Koyu kıvamlı, kakaosu bol.", "Thick and cocoa-rich."),
            P("Salep", "Salep", 170m, "Üzerine tarçın serpilmiş kış klasiği.", "A winter classic dusted with cinnamon."),
            Milky(P("Chai Tea Latte", "Chai Tea Latte", 175m, "Tarçın, zencefil ve kakuleli çay ile süt.", "Tea with cinnamon, ginger and cardamom, plus milk."), withSize: false, withShot: false));

        var iced = Cat("Soğuk Kahveler", "Iced Coffees", 2,
            P("Iced Americano", "Iced Americano", 160m, "Buzun üzerine espresso ve soğuk su.", "Espresso and cold water over ice."),
            Milky(P("Iced Latte", "Iced Latte", 185m, "Buz, soğuk süt ve espresso.", "Ice, cold milk and espresso.")),
            Milky(P("Iced Mocha", "Iced Mocha", 200m, "Çikolatalı, buz gibi bir mocha.", "An ice-cold chocolate mocha.")),
            P("Cold Brew", "Cold Brew", 200m, "16 saat soğuk demlenmiş, düşük asitli.", "Steeped cold for 16 hours, low in acidity."),
            P("Milkshake", "Milkshake", 210m, "Dondurmayla çırpılmış, yoğun kıvamlı.", "Blended with ice cream, thick and creamy.",
                Required("Aroma", "Flavor", ("Çikolata", "Chocolate", 0m), ("Çilek", "Strawberry", 0m),
                    ("Vanilya", "Vanilla", 0m), ("Muz", "Banana", 0m))));

        var cold = Cat("Soğuk İçecekler", "Cold Drinks", 3,
            P("Su", "Water", 30m, "Pet şişe kaynak suyu.", "Bottled spring water."),
            P("Soda", "Sparkling Water", 60m, "Doğal maden suyu.", "Natural mineral water."),
            P("Limonata", "Lemonade", 140m, "Taze sıkılmış limonla ev yapımı.", "Homemade with freshly squeezed lemons."),
            P("Buzlu Çay", "Iced Tea", 140m, "Şeftalili, ev yapımı soğuk çay.", "Homemade peach iced tea."),
            P("Naneli Limonata", "Mint Lemonade", 160m, "Limonata, taze nane ve bol buz.", "Lemonade with fresh mint and lots of ice."),
            P("Frozen", "Frozen", 195m, "Buzla çekilmiş meyveli içecek.", "Fruit blended with ice.",
                Required("Aroma", "Flavor", ("Mango", "Mango", 0m), ("Çilek", "Strawberry", 0m), ("Karpuz", "Watermelon", 0m))));

        var teas = Cat("Çaylar", "Teas", 4,
            P("Bitki Çayı", "Herbal Tea", 160m, "Demlikte servis edilen bitki çayı.", "Herbal tea served in a pot.",
                Required("Çeşit", "Variety", ("Ihlamur", "Linden", 0m), ("Adaçayı", "Sage", 0m),
                    ("Kuşburnu", "Rosehip", 0m), ("Yeşil Çay", "Green Tea", 0m))),
            P("Çay", "Turkish Tea", 45m, "İnce belli bardakta taze demlenmiş çay.", "Freshly brewed tea in a tulip glass.",
                Required("Sunum", "Serving", ("Bardak", "Glass", 0m), ("Fincan", "Cup", 15m))));

        return [hot, iced, cold, teas];
    }

    private static Category Cat(string tr, string en, int order, params Product[] products)
    {
        for (var i = 0; i < products.Length; i++) products[i].SortOrder = i + 1;
        return new Category { NameTr = tr, NameEn = en, SortOrder = order, Products = [.. products] };
    }

    private static Product P(string tr, string en, decimal price, string descTr, string descEn, params OptionGroup[] groups) =>
        new()
        {
            NameTr = tr, NameEn = en, Price = price, DescriptionTr = descTr, DescriptionEn = descEn,
            IsFeatured = Featured.Contains(tr), OptionGroups = Ordered(groups)
        };

    private static Product Milky(Product p, bool withSize = true, bool withShot = true)
    {
        var groups = new List<OptionGroup>
        {
            Required("Süt", "Milk", ("Normal", "Regular", 0m), ("Laktozsuz", "Lactose-free", 20m), ("Yulaf", "Oat", 30m))
        };
        if (withSize) groups.Add(Required("Boy", "Size", ("Small", "Small", 0m), ("Medium", "Medium", 20m), ("Large", "Large", 40m)));
        if (withShot) groups.Add(Group("Ekstra", "Extras", required: false, ("Ekstra shot", "Extra shot", 40m)));
        p.OptionGroups = Ordered([.. groups]);
        return p;
    }

    private static OptionGroup Required(string tr, string en, params (string Tr, string En, decimal Delta)[] options) =>
        Group(tr, en, required: true, options);

    private static OptionGroup Group(string tr, string en, bool required, params (string Tr, string En, decimal Delta)[] options) =>
        new()
        {
            NameTr = tr, NameEn = en, IsRequired = required, MinSelect = required ? 1 : 0, MaxSelect = 1,
            Options = options.Select((o, i) => new Option { NameTr = o.Tr, NameEn = o.En, PriceDelta = o.Delta, SortOrder = i + 1 }).ToList()
        };

    private static List<OptionGroup> Ordered(OptionGroup[] groups)
    {
        for (var i = 0; i < groups.Length; i++) groups[i].SortOrder = i + 1;
        return [.. groups];
    }
}
