# Şimdi Açık — işletim ve geri dönüş

## Kaynak durumu

`npm run monitor:sources`, desteklenen dokuz ilin sabit il merkezi koordinatlarında küçük bir alanı sorgular. Kullanıcı konumu kullanılmaz. Kontrol HTTP durumu, yanıt tarihi, kayıtların gelecekteki geçerlilik süresi ve gecikmeyi raporlar. Geçerli boş yanıt hata değildir. `.github/workflows/source-monitor.yml` görevi altı saatte bir ve manuel tetikleme ile çalışır. Başarısız bir kaynak kontrolü, kaydın doğru veya yanlış olduğunu fiziksel olarak kanıtlamaz.

## Bozuk veri sağlayıcısı

Kaynağa erişilemiyorsa, veri şeması/tarih doğrulanamıyorsa veya nöbet geçerliliği biterse kayıtlar açıkmış gibi korunmaz. Kullanıcı tekrar deneyebilir veya doğru ilin resmî eczacı odası bağlantısını açabilir. TLS denetimini kapatmak, captcha atlatmak, geçmiş günü bugünün verisi gibi sunmak ve sahte kayıt üretmek çözüm değildir.

## Kalite kapısı

`npm test`, `npm run build:railway` ve TypeScript/ESLint kontrolü dağıtımdan önce çalıştırılır. `.github/workflows/quality.yml` ana dal ve PR için fixture testlerini ve üretim derlemesini çalıştırır. Canlı kaynak kontrolü bu testlerden ayrıdır; testler harici kaynaklara bağımlı değildir. Railway'de **Wait for CI** açık tutulmalıdır.

## Geri dönüş

1. Railway → simdiacik → Deployments bölümünde önceki başarılı sürümü seç.
2. Deployment actions → Rollback ile önceki çalışan sürümü geri getir; yanlış sürümü silme.
3. `/api/health` yanıtındaki commit kimliğini, ana sayfayı ve `/api/places` yanıtını kontrol et.
4. Sorun yalnızca bir upstream kaynağı etkiliyorsa eski nöbet kayıtlarını geri getirme; resmî liste alternatifini koru.

Bu çalışma öncesindeki başarılı uygulama sürümü: `9905669c1b13eb5a9b1876063563ce52f1175241`.

## DNS ve www

Alan adı Railway → Workspace → Domains → simdiacik.com üzerinden yönetilir. Yetkili nameserver adlarının `name.com` ile bitmesi, alan adının Railway'deki DNS yönetiminden ayrı olduğu anlamına gelmez. `www` CNAME ve `_railway-verify.www` TXT kayıtları Railway alan adı ekleme sırasında oluştu. Edge Rules kuralı yalnızca `Host is www.simdiacik.com` için `simdiacik.com` hedefine 301 gönderir; yol ve sorgu korunur. Ana domain aynı kurala eşleşmez.

## Harita kapasitesi

Varsayılan harita döşemesi OSMF'nin HTTPS standart hizmetidir. Tarayıcı önbelleği/Referer ve görünür atıf korunur; offline tile ve toplu indirme yapılmaz. Bu hizmet sınırsız kapasite veya SLA sağlamaz. Trafik büyürse lisansı/kapasitesi uygun bir sağlayıcı veya kendi altyapısı seçilmeli:

- `NEXT_PUBLIC_MAP_TILE_URL`: HTTPS `{z}/{x}/{y}` şablonu.
- `NEXT_PUBLIC_MAP_TILE_CREDIT`: görünür kaynak adı.
- `NEXT_PUBLIC_MAP_TILE_CREDIT_URL`: HTTPS lisans/atıf bağlantısı.

Bu değerler istemciye açıktır; gizli anahtar konulmaz. Değişiklik yeni build gerektirir. Özel sağlayıcı atıf bilgisi zorunludur; geçersiz ayar liste alternatifini bozmadan haritayı durdurur.

[OSMF Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/) ve [Railway domain yönetimi](https://docs.railway.com/networking/domains/railway-domains).

## Saklama ve gizlilik

- GPS kaydı: cihazın yerel depolamasında en fazla 24 saat; izin reddinde temizlenir.
- Hatırlanması seçilen il/ilçe: cihazda en fazla 30 gün.
- Kayıtlı konumu sil düğmesi iki kaydı da kaldırır.
- Arama geçmişi için kalıcı uygulama veritabanı yoktur. URL filtresi tarayıcı geçmişinde bulunabilir; bu özellik yeni GPS koordinatı eklemez.
- Analitik etiketler izin verilmeden yüklenmez. İzin geri çekildiğinde bilinen GA çerezleri kaldırılır ve etiketlerin kaldırılması için sayfa yenilenir.
- İstek limiti process-local'dir. Birden çok kopyaya geçişte ortak edge veya Redis limiti gerekir. Hassas koordinatlar uygulama hata loglarına yazılmaz; barındırma sağlayıcısının erişim kayıtları ayrıca değerlendirilmelidir.

## Dışarıdan tamamlanması gerekenler

KVKK işletmeci kimliği/başvuru adresi, kurum kaynaklarının ticari yeniden yayınlama hakkı, gerçek cihaz/ekran okuyucu testleri ve trafik kapasitesi kodun başarılı derlenmesiyle doğrulanmış sayılmaz. Kabul raporunda bunlar açıkça ayrılmıştır.
