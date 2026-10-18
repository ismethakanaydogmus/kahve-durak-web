# Canlıya alma (Supabase + Render + Vercel)

Portföy demosudur: ödemeler iyzico **sandbox** ile alınır, gerçek para çekilmez. Site `noindex` ve demo banner'ı ile yayınlanır.

**Sıra önemli:** Supabase → Vercel (adresi almak için) → Render → Vercel'e API adresi → canlı test.

> **Güvenlik:** Şifreler ve anahtarlar sadece ilgili panelin ortam değişkenleri ekranına girilir. Repoya, sohbete ya da
> ekran görüntüsüne girmez. Sadece adresler (`….supabase.co`, `….onrender.com`, `….vercel.app`) gizli değildir.

## 1. Supabase

1. **New project.** Bölge **Frankfurt (eu-central-1)**. Veritabanı şifresini kaydet; içinde `;` ve `'` olmasın.
   **Enable Data API kapalı** olmalı: uygulama veritabanına doğrudan bağlanıyor, açık bırakılırsa tablolar
   (kullanıcılar dahil) Supabase'in herkese açık REST API'sinden erişilebilir hale gelebilir.
2. **Connect → Session pooler** bilgilerini al. Direct bağlantıyı kullanma: o sadece IPv6 ile çalışır ve Render'dan
   ulaşılamayabilir. Bağlantı cümlesi şu biçimde olacak:
   ```
   Host=aws-0-eu-central-1.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.<proje-ref>;Password=<şifre>;SSL Mode=Require
   ```
3. **Storage → New bucket:** adı `images`, **Public bucket** işaretli.
4. **Project Settings → API Keys:** Proje adresini (`https://<proje-ref>.supabase.co`) ve **Secret key**'i (`sb_secret_…`) al.

Tablolar ve seed verisi (menü, mahalleler, admin kullanıcısı) API ilk açıldığında otomatik oluşturulur.

## 2. Vercel (site)

1. **Add New → Project** ile GitHub reposunu import et.
2. **Root Directory:** `client`. Framework Vite olarak algılanır (build `npm run build`, çıktı `dist`).
3. Deploy et ve adresi not et (`https://<ad>.vercel.app`). API henüz olmadığı için site veri gösteremez; bu normal.

`client/vercel.json`, `/menu` gibi adreslerin yenilendiğinde de açılmasını sağlar.

## 3. Render (API)

**New → Web Service** ile GitHub reposunu seç:

| Ayar | Değer |
|---|---|
| Root Directory | `api` |
| Runtime / Language | Docker |
| Dockerfile Path | `api/KahveDurak.Api/Dockerfile` |
| Docker Build Context Directory | `api` |
| Region | Frankfurt |
| Instance | Free |
| Health Check Path | `/health` |

**Environment variables** (çift alt çizgi `__`, .NET'te `:` anlamına gelir):

| Değişken | Değer |
|---|---|
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `ConnectionStrings__Default` | Supabase Session pooler bağlantı cümlesi (yukarıdaki biçim) |
| `Jwt__Secret` | en az 32 karakterlik rastgele bir değer (ör. bir şifre yöneticisinin ürettiği 48 karakter) |
| `Admin__Email` | admin girişi için e-posta (ör. `admin@kahvedurak.local`) |
| `Admin__Password` | güçlü bir admin şifresi |
| `Cors__Origins__0` | `https://<ad>.vercel.app` (sonda `/` yok) |
| `Payments__Provider` | `Iyzico` |
| `Payments__ApiPublicUrl` | `https://<servis>.onrender.com` |
| `Payments__FrontendUrl` | `https://<ad>.vercel.app` |
| `Iyzico__ApiKey` | iyzico sandbox API anahtarı |
| `Iyzico__SecretKey` | iyzico sandbox güvenlik anahtarı |
| `Iyzico__BaseUrl` | `https://sandbox-api.iyzipay.com` |
| `Storage__Provider` | `Supabase` |
| `Storage__SupabaseUrl` | `https://<proje-ref>.supabase.co` |
| `Storage__SupabaseServiceKey` | Supabase Secret key (`sb_secret_…`) |
| `Storage__Bucket` | `images` |
| `Proxy__TrustForwardedHeaders` | `true` (Render'ın proxy'sinden gelen gerçek müşteri IP'si iyzico'ya gider) |

`Payments__ApiPublicUrl` Render adresini gerektirir. Adres servis oluşturulurken belli olur; bilinmiyorsa önce diğerlerini
girip deploy et, adresi öğrenince bu değişkeni ekleyip yeniden deploy et.

Eksik ya da yanlış bir ayar varsa API **açılmaz**; Render loglarında hangi ayarın eksik olduğu yazar. Bu bilinçli yapıldı:
yarım ayarla açılıp ödemede patlamasındansa deploy'da fark edilmesi daha iyi.

Ücretsiz planda API 15 dakika istek gelmezse uyur; ilk istekte uyanması 30–60 saniye sürebilir. Site ve canlı bağlantı
bunu bekleyip yeniden dener.

## 4. Vercel'e API adresi

**Settings → Environment Variables:** `VITE_API_URL` = `https://<servis>.onrender.com` (Production). Sonra **Deployments → Redeploy**.
Vite bu değeri build sırasında koda yazdığı için değiştirdikten sonra mutlaka yeniden deploy etmek gerekir.

## 5. Canlı test listesi

1. Site açılıyor, menü ve slider görünüyor, `/menu` adresini yenileyince sayfa açılıyor.
2. Kayıt ol → sepete içecek ekle → **Gel-Al** → Öde → iyzico sayfası açılıyor.
   Test kartı `5890040000000016`, gelecekte bir son kullanma tarihi, herhangi bir CVC.
3. Ödemeden sonra sipariş sayfası "Ödemen alındı" diyor.
4. İkinci bir pencerede admin girişi (`/admin`): sipariş "Yeni" sütununda, bildirim geldi.
   "Hazırlamaya başla" → müşteri sayfası kendiliğinden güncelleniyor.
5. Admin → Menü → bir ürüne fotoğraf yükle → fotoğraf Supabase adresinden (`…supabase.co/storage/v1/object/public/images/…`) geliyor.
6. Admin → Ayarlar → teslimat ücretini değiştir → sitede yeni ücret görünüyor.
