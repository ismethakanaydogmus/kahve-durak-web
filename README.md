# Kahve Durak

Üsküdar'da bir mahalle kafesi için online içecek siparişi sitesi: menü, sepet, gel-al ya da adrese teslim, online ödeme,
canlı sipariş takibi ve işletme için admin paneli.

> **Portföy demosu.** Kahve Durak kurgusal bir kafedir; işletme adı, adres, telefon, menü, yorumlar ve görseller demo için
> hazırlanmıştır. Ödemeler iyzico **sandbox** ile alınır, gerçek para çekilmez ve sipariş teslim edilmez.

**Canlı demo:** https://kahve-durak-web.vercel.app

Ücretsiz sunucu 15 dakika boşta kalınca uyuduğu için ilk açılışta menünün gelmesi 30–60 saniye sürebilir.
Test ödemesi için kart `5890040000000016`, son kullanma tarihi gelecekte herhangi bir tarih, CVC herhangi 3 hane.

## Özellikler

**Müşteri**
- Ana sayfa: slider, kategoriler, öne çıkan ürünler, misafir yorumları, çalışma saatleri ve harita
- Menü ve ürün seçenekleri (süt, boy, ekstra shot gibi); fiyat seçimlere göre güncellenir
- Giriş yapmadan sepet; siparişi tamamlarken hesap oluşturma ya da giriş
- Gel-al ya da adrese teslim: teslimat mahalleleri, minimum tutar ve teslimat ücreti, kayıtlı adresler
- iyzico Checkout Form ile ödeme; kart bilgisi bu sunuculara hiç gelmez
- Sipariş sayfası durum değişince sayfa yenilemeden güncellenir
- Türkçe ve İngilizce arayüz

**İşletme (admin paneli)**
- Sipariş panosu: yeni siparişler anında düşer, bildirim ve ses çalar; tek tuşla bir sonraki adıma geçirilir
- Menü yönetimi: kategori, ürün, seçenek grupları, sıralama, "Tükendi", ürün fotoğrafı yükleme
- İçerik: slider ve misafir yorumları
- Ayarlar: çalışma saatleri, teslimat ücreti, minimum tutar, mahalleler, iletişim bilgileri
- Özet: günlük ciro, sipariş sayısı, ortalama sepet ve son 7 günün en çok satanları

## Teknolojiler

| Katman | Kullanılanlar |
|---|---|
| Site | React 19, Vite, TypeScript, Tailwind CSS, TanStack Query, Zustand, React Hook Form + Zod, i18next |
| API | ASP.NET Core Web API (.NET 10), EF Core, FluentValidation, SignalR, JWT |
| Veritabanı | PostgreSQL (lokalde Docker, canlıda Supabase) |
| Dosyalar | Supabase Storage (canlı), yerel disk (geliştirme) |
| Ödeme | iyzico Checkout Form (sandbox) |
| Test | xUnit + Testcontainers, Vitest + React Testing Library + MSW |
| Yayın | Vercel (site), Render (API, Docker) |

Fiyatlar her zaman sunucuda hesaplanır; sepetten gelen fiyata güvenilmez. Sipariş durumu değişiklikleri ve ödeme
dönüşleri, iki istek aynı anda gelse bile siparişi tutarsız bırakmayacak şekilde yazılır.

## Proje yapısı

```
client/   React sitesi (müşteri sayfaları + /admin)
api/      ASP.NET Core API ve testleri
docs/     canlıya alma rehberi
```

## Lokal çalıştırma

Gereken: Docker Desktop, .NET 10 SDK, Node 22+.

**1. Secret'lar (bir kez).** API secret'ları repoda değil, `dotnet user-secrets` içinde tutulur. JWT secret'ı
olmadan API açılmaz.

```bash
cd api/KahveDurak.Api
dotnet user-secrets set "Jwt:Secret" "<en az 32 karakterlik rastgele değer>"
dotnet user-secrets set "Admin:Password" "<admin şifresi>"
```

**2. Çalıştırma.** Üç ayrı terminalde, repo kök klasöründen:

```bash
docker compose up -d                                 # PostgreSQL → localhost:5434
dotnet run --project api/KahveDurak.Api              # API → http://localhost:5080
cd client && npm install && npm run dev              # Site → http://localhost:5173
```

API ilk açılışta tabloları oluşturur ve örnek menüyü, mahalleleri ve admin kullanıcısını ekler.

## Testler

```bash
dotnet test api            # Docker açık olmalı (Testcontainers kendi PostgreSQL'ini açar)
cd client && npm test
```

## Ödeme

**Lokal (varsayılan):** `appsettings.Development.json` içinde `Payments:Provider = Fake`. "Öde"ye basınca API'nin
sunduğu bir test sayfası açılır; "Ödeme başarılı" ya da "Ödeme başarısız" seçilir. iyzico hesabı gerekmez.
Fake sağlayıcı yalnızca Development ve Testing ortamlarında açılır.

**iyzico sandbox ile denemek için:** https://sandbox-merchant.iyzipay.com adresinden ücretsiz hesap açın, sonra:

```bash
cd api/KahveDurak.Api
dotnet user-secrets set "Payments:Provider" "Iyzico"
dotnet user-secrets set "Iyzico:ApiKey" "<sandbox API key>"
dotnet user-secrets set "Iyzico:SecretKey" "<sandbox secret key>"
```

Test kartları ve hata senaryoları: https://docs.iyzico.com/ek-bilgiler/test-kartlari

`Provider = Iyzico` iken anahtarlar boşsa API açılmaz; anahtarsız bir deploy ödeme anında değil, açılışta fark edilir.

## Admin paneli

Lokalde `http://localhost:5173/admin`. Giriş: `admin@kahvedurak.local` ve user-secrets'taki `Admin:Password`.

- **Siparişler:** Aktif siparişler "Yeni", "Hazırlanıyor" ve "Hazır / Yolda" sütunlarında, en eski üstte. Ödemesi doğrulanmamış siparişler görünmez.
- **Sipariş detayı:** Tek butonla bir sonraki adıma geçirilir ("Hazırlamaya başla", "Hazır, müşteriye haber ver", "Yola çıktı",
  "Teslim edildi"). "Hazırlanıyor" aşamasına kadar iptal edilebilir; iptal ödeme iadesi yapmaz. İki kişi aynı anda işlem yaparsa
  ikincisi "Sipariş az önce güncellendi" uyarısı alır.
- **Menü:** Seçenek düzenlemek müşterilerin sepetini bozmaz; silinen ürün menüden kalkar ama eski siparişlerde görünür.
- **Ayarlar:** Kapanış saati açılıştan erkense ertesi güne sayılır (ör. 10:00–03:00). Harita linki yalnızca google.com/maps olabilir.
- **Özet:** "Bugün" İstanbul saatiyle gece yarısında başlar.
- **Sesli bildirim:** Tarayıcılar, sayfaya tıklanmadan ses çalmaya izin vermez. Panel açıldığında üstteki "Sesli bildirim" butonuna
  bir kez basın.

Canlı güncellemeler SignalR ile `/hubs/orders` üzerinden gelir.

## Görseller

Admin panelinden JPG, PNG ya da WebP yüklenir (en fazla 5 MB; tür dosyanın içeriğinden anlaşılır, SVG kabul edilmez).

- **Lokal:** Dosyalar `api/KahveDurak.Api/wwwroot/uploads/` klasörüne yazılır (git'e girmez) ve `/uploads/...` adresinde sunulur.
- **Canlı:** Render'ın diski kalıcı olmadığı için Supabase Storage kullanılır.

Başlangıçtaki slider görselleri bu proje için çizilmiş SVG'lerdir (`client/public/seed/`).

## Canlıya alma

Supabase, Render ve Vercel kurulumu ile tüm ortam değişkenleri: [docs/deploy.md](docs/deploy.md)

## Lisans

Kod [MIT](LICENSE) lisansı ile yayınlanmıştır.
