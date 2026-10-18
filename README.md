# Kahve Durak — Web

> Portföy demosu. Siparişler gerçek değildir.

Üsküdar'da kurgusal bir mahalle kafesi olan Kahve Durak için online içecek siparişi sitesi. İşletme adı, adres,
telefon, menü, yorumlar ve görseller demo için uydurulmuştur; gerçek bir işletmeyle ilgisi yoktur.

- `client/` — React + Vite + TypeScript + Tailwind
- `api/` — ASP.NET Core Web API (.NET 10) + EF Core + PostgreSQL
- `docs/` — canlıya alma rehberi

## Lokal çalıştırma

Gereken: Docker Desktop, .NET 10 SDK, Node 22+.

```bash
docker compose up -d                                  # PostgreSQL → localhost:5434
dotnet run --project api/KahveDurak.Api             # API → http://localhost:5080
cd client && npm install && npm run dev               # Site → http://localhost:5173
```

## Testler

```bash
dotnet test api            # Docker açık olmalı (Testcontainers)
cd client && npm test
```

## Lokal secret'lar

API secret'ları repoda değil, `dotnet user-secrets` içinde tutulur:

```bash
cd api/KahveDurak.Api
dotnet user-secrets set "Jwt:Secret" "<en az 32 karakterlik rastgele değer>"
dotnet user-secrets set "Admin:Password" "<admin şifresi>"   # admin@kahvedurak.local olarak seed edilir
```

## Ödeme

Ödeme iyzico Checkout Form ile alınır: kart bilgileri iyzico'nun sayfasına girilir, bu API'ye hiç gelmez.

**Lokal geliştirme (varsayılan):** `appsettings.Development.json` içinde `Payments:Provider = Fake`. "Öde"ye basınca API'nin
sunduğu bir test sayfası açılır; "Ödeme başarılı" ya da "Ödeme başarısız" seçilir. iyzico hesabı gerekmez.
Fake sağlayıcı yalnızca Development ve Testing ortamlarında açılır.

**iyzico sandbox ile denemek için:** https://sandbox-merchant.iyzipay.com adresinden ücretsiz hesap aç, sonra:

```bash
cd api/KahveDurak.Api
dotnet user-secrets set "Payments:Provider" "Iyzico"
dotnet user-secrets set "Iyzico:ApiKey" "<sandbox API key>"
dotnet user-secrets set "Iyzico:SecretKey" "<sandbox secret key>"
```

Test kartı: `5890040000000016` (Akbank, Mastercard). Son kullanma tarihi gelecekte herhangi bir tarih, CVC herhangi
3 hane olabilir. Diğer kartlar ve hata senaryoları: https://docs.iyzico.com/ek-bilgiler/test-kartlari

`Provider = Iyzico` iken anahtarlar boşsa API açılmaz; bu, canlıda anahtarsız deploy'u fark etmek içindir.

## Admin paneli

`http://localhost:5173/admin` adresinde. Giriş: `admin@kahvedurak.local` ve user-secrets'taki `Admin:Password`.

- **Siparişler:** Aktif siparişler "Yeni", "Hazırlanıyor" ve "Hazır / Yolda" sütunlarında, en eski üstte. Ödemesi doğrulanmamış siparişler görünmez.
  Yeni sipariş sayfa yenilemeden düşer; bildirim ve ses çalar.
- **Sipariş detayı:** Tek butonla bir sonraki adıma geçirilir ("Hazırlamaya başla", "Hazır, müşteriye haber ver", "Yola çıktı",
  "Teslim edildi"). "Hazırlanıyor" aşamasına kadar iptal edilebilir; iptal ödeme iadesi yapmaz. İki kişi aynı anda işlem yaparsa
  ikincisi "Sipariş az önce güncellendi" uyarısı alır.
- **Menü:** Kategori ve ürün ekle/düzenle/sil, ↑/↓ ile sırala, tek tıkla "Tükendi". Ürün editöründe seçenek grupları
  (süt, boy, ekstra; zorunlu/isteğe bağlı, tek/çoklu seçim). Seçenek düzenlemek müşterilerin sepetini bozmaz;
  silinen ürün menüden kalkar ama eski siparişlerde görünür. Fiyat 0'dan büyük olmalı.
- **İçerik:** Ana sayfa slider'ı ve misafir yorumları (yayına al/kaldır, sırala).
- **Ayarlar:** Çalışma saatleri (kapanış açılıştan erkense ertesi gün), teslimat ücreti, minimum tutar,
  teslimat mahalleleri, telefon, adres ve Google Maps harita linki (sadece google.com/maps).
- **Özet:** Bugünkü ciro, sipariş sayısı, ortalama sepet ve son 7 günün en çok satanları. "Bugün" İstanbul saatiyle gece yarısında başlar.
- **Sesli bildirim:** Tarayıcılar, sayfaya tıklanmadan ses çalmaya izin vermez. Panel açıldığında üstteki "Sesli bildirim" butonuna
  bir kez basın (ya da bildirimdeki "Sesli bildirimi aç"a).

Canlı güncellemeler SignalR ile `/hubs/orders` üzerinden gelir. Müşterinin sipariş sayfası da durum değişince kendiliğinden güncellenir.

## Görseller

Admin panelinden JPG, PNG ya da WebP yüklenir (en fazla 5 MB; tür dosyanın içeriğinden anlaşılır, SVG kabul edilmez).

- **Lokal:** `Storage:Provider = Local` (Development varsayılanı). Dosyalar `api/KahveDurak.Api/wwwroot/uploads/` klasörüne
  yazılır (git'e girmez) ve API tarafından `/uploads/...` adresinde sunulur.
- **Canlı:** Render'ın diski kalıcı olmadığı için Supabase Storage kullanılır. `Storage:Provider=Supabase`,
  `Storage:SupabaseUrl`, `Storage:SupabaseServiceKey` ve `Storage:Bucket` (varsayılan `images`, public) gerekir; eksikse API açılmaz.
