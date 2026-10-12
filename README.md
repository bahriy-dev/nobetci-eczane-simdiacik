# Şimdi Açık

Yakınındaki nöbetçi eczaneyi bulmak, resmî nöbet kaynağını görmek, telefonla teyit etmek ve yol tarifi almak için Türkiye odaklı, mobil uyumlu uygulama. Kullanılan veri kaynakları için API anahtarı, kayıt veya ücretli abonelik gerekmez.

## Özellikler

- TurkiyeAPI v2 üzerinden 81 il ve ile bağlı ilçelerle bölge seçimi.
- İl merkezi koordinatı; ilçe/mahalle/adres araması ve kullanıcı izinli cihaz konumu.
- 2, 5, 10 ve 20 km mesafe seçenekleri, telefon ve yol tarifi.
- Liste/harita, ortada açılan detay paneli ve açık/koyu tema.
- Eczane adı ve adres araması. Üretken AI kullanılmaz.
- İki dakikalık görünür sayfa yenilemesi, 60 saniyelik sonuç önbelleği.
- Eczane işaretleriyle harita, sağlık temalı uygulama simgesi ve PWA.
- Çevrimdışıyken bağlantı gerektiğini bildiren sayfa. Canlı nöbet listeleri, API yanıtları ve harita katmanları çevrimdışı önbelleğe alınmaz; eski çevrimdışı sayfa önbellekleri sürüm yükseltmesinde silinir.
- 81 il için Türk Eczacıları Birliği (TEB) rehberinden ilgili resmî oda veya nöbet sayfası bağlantısı. Bu yönlendirme, 81 ilde otomatik liste erişimi anlamına gelmez.

## Ücretsiz veri kaynakları ve sınırlar

**İl/ilçe:** TurkiyeAPI v2, `https://api.turkiyeapi.dev/v2/provinces` ve `/v2/provinces/{id}/districts`. Bağımsız ve açık kaynak idari veri projesidir; eczane veya nöbet verisi içermez. İl koordinatları il merkezleridir; ilçelerin API'de koordinatı yoktur. İlçe konumu yalnızca kullanıcı bölgeyi kullanmayı seçince Nominatim üzerinden bulunur. Şema, il–ilçe ilişkisi, koordinatlar ve listenin bütünlüğü doğrulanır. Sunucu ve HTTP önbelleği beş dakikadır; sınırsız kullanım veya SLA varsayılmaz.

**Nöbetçi eczane:** Kodda aşağıdaki otomatik sağlayıcılar bulunur. Kaynak alınırken erişimi ve yanıtın güncelliği doğrulanır; bu liste sürekli erişim veya yayımlanan sürümde bütün kaynakların başarıyla çalıştığına dair bir garanti değildir.

| İl | Resmî kaynak ve yöntem |
| --- | --- |
| İstanbul, Yalova | İstanbul Eczacı Odası'nın halka açık nöbet sayfası ve sayfanın kullandığı JSON işlemi. |
| Ankara | Ankara Eczacı Odası'nın tarihli `getPharmacies/YYYY-MM-DD` işlemi. |
| İzmir | İzmir Büyükşehir Belediyesi'nin belgelenmiş `https://openapi.izmir.bel.tr/api/ibb/nobetcieczaneler` uç noktası. |
| Kayseri | Belediyenin [CBS nöbet sayfası](https://cbs.kayseri.bel.tr/kayseri-nobetci-eczaneler) ve aynı sayfanın harita işlemi. Tarihli tablo ile harita kayıtları ad, adres, ilçe ve telefon üzerinden eşleştirilir. Ağ veya biçim hatasında belediyenin `https://acikveri.kayseri.bel.tr/api/kbb/eczane` açık veri kaynağı HTTPS üzerinden yedek olarak denenir. HTTP kullanılmaz; erişim reddi yedek istekle aşılmaz. |
| Konya | Konya Eczacı Odası'nın bağlantı verdiği [resmî nöbet sitesi](https://www.konyanobetcieczaneleri.com/) ve kendi sayfasının kullandığı veri işlemi. Sayfadaki herkese açık istek belirteci hesap veya API anahtarı değildir. |
| Samsun, Sinop | [Samsun Eczacı Odası nöbet sayfası](https://www.samsuneczaciodasi.org.tr/nobetci-eczaneler). İller sayfanın açıkça ayrı yayımladığı Samsun ve Sinop bölümlerinden seçilir. |
| Gaziantep | [Gaziantep Büyükşehir Belediyesi nöbet sayfası](https://www.gaziantep.bel.tr/tr/nobetci-eczaneler). Tarih seçimi ve her kartın kendi telefon, adres ve harita koordinatı doğrulanır. |

Oda ve belediye web işlemleri halka açık resmî kaynaklardır; belgelenmiş ticari API sözleşmesi veya açık veri lisansı oldukları varsayılmaz. Kayseri'nin özgün açık veri kümesi CC BY 4.0 olarak yayımlanmıştır; bu lisans CBS web sayfasına veya diğer kaynaklara genellenmez. Biçim, tarih veya erişim doğrulanamazsa eski ya da örnek kayıt gösterilmez. Samsun, Sinop, Konya ve Gaziantep sağlayıcıları yalnız Türkiye saat dilimindeki bugünün listesini kabul eder; önceki günden nöbet aralığı çıkarılmaz.

**81 il için resmî yönlendirme:** TEB'nin oda rehberi il–oda eşleşmesini sağlar. Otomatik sağlayıcı bulunmayan veya güncel liste alınamayan yerde doğrulanmış nöbet sayfası, ilgili eczacı odası sitesi ya da TEB rehberi bağlantısı gösterilir. Bir odanın birden çok ile hizmet vermesi, o illerin otomatik veri kapsamına girdiği anlamına gelmez. Genel eczane kayıtları nöbetçi eczane olarak gösterilmez.

**Harita ve adres:** Leaflet, OpenStreetMap harita katmanları ve Nominatim. Kullanıcı adres aramasını gönderince konum sorgulanır; otomatik adres tamamlama yapılmaz. Atıf görünürdür. Kamu servislerinin adil kullanım sınırları uygulanır; ücretsiz veri kullanımı sınırsız kapasite garantisi değildir.

“Nöbet listesinde” olmak, eczanenin o anda hizmet verdiğinin telefonla teyit edildiği anlamına gelmez. Kaynak ve veri alınma zamanı sunucu veri modelinde doğrulanır. Nöbet doğrulaması en fazla beş dakika geçerlidir. Tarih veya nöbet aralığına göre sınır uygulayan sağlayıcılarda bu süre daha kısa olabilir. Yola çıkmadan önce eczaneyi aramak gerekir.

## Yerel çalıştırma

Node.js 22.13+ ve npm gerekir. API anahtarı veya `.env` ayarı gerekmez.

```sh
npm ci
npm run dev
```

```sh
node node_modules/typescript/bin/tsc --noEmit
npm run build
```

## Mimari

React + TypeScript + Tailwind; Next uyumlu Vinext; REST sunucu rotaları; Cloudflare Worker. Arayüz `/api/places`, `/api/location` ve `/api/regions` üzerinden veri alır. Tema tercihi cihazda saklanır; favori özelliği bulunmaz. Önbellek, Worker içinde sınırlı ve kısa ömürlü tamamlanmış değerlerden oluşur. Kullanıcı hesabı veya PostgreSQL kullanılmaz. RapidAPI/CollectAPI bağlantısı ve anahtar gereksinimi kaldırılmıştır.

Ücretsiz veri şartı, alan adı veya gelecekte seçilecek barındırma hizmetlerinin fiyatına dair bir taahhüt değildir. `simdiacik.com` alan adı satın alınmamış veya bağlanmamıştır.

## Kaynaklar

- [TurkiyeAPI idari yapı belgesi](https://docs.turkiyeapi.dev/tr/v2/guide/administrative-structure.html)
- [TurkiyeAPI](https://turkiyeapi.dev/)
- [TEB eczacı odaları rehberi](https://teb.org.tr/odalar)
- [TEB bölge eczacı odaları listesi](https://www.teb.org.tr/content/00f1d445-5d27-410c-8402-0b60ce0d6182/bolge-eczaci-odalari-listesi)
- [İstanbul Eczacı Odası nöbet sayfası](https://www.istanbuleczaciodasi.org.tr/nobetci-eczane/)
- [Ankara Eczacı Odası nöbet sayfası](https://www.aeo.org.tr/nobetci-eczaneler)
- [Kayseri CBS nöbet sayfası](https://cbs.kayseri.bel.tr/kayseri-nobetci-eczaneler)
- [Kayseri açık veri kümesi](https://acikveri.kayseri.bel.tr/veri-seti/eczane-bilgileri/11)
- [İzmir web servis belgesi](https://openfiles.izmir.bel.tr/111324/docs/ibbapi-WebServisKullanimDokumani_1.0.pdf)
- [Konya Eczacı Odası](https://keo.org.tr/)
- [Konya resmî nöbet sitesi](https://www.konyanobetcieczaneleri.com/)
- [Samsun ve Sinop resmî nöbet sayfası](https://www.samsuneczaciodasi.org.tr/nobetci-eczaneler)
- [Gaziantep Belediyesi nöbet sayfası](https://www.gaziantep.bel.tr/tr/nobetci-eczaneler)
- [OpenStreetMap atıf ve lisans](https://www.openstreetmap.org/copyright)
- [Harita katmanı kullanım ilkeleri](https://operations.osmfoundation.org/policies/tiles/)
- [Nominatim kullanım ilkeleri](https://operations.osmfoundation.org/policies/nominatim/)

Yayımlanan sürüm sahibiyle sınırlı özel erişimdedir. Paylaşım kitlesi kullanıcı talebi olmadan genişletilmez.

## Railway dağıtımı

Depoda `railway.json` bulunur. Railway servisini bu GitHub deposuna bağlayınca derleme komutu `npm run build:railway`, başlatma komutu `npm run start:railway` olarak uygulanır. Node sunucusu Railway'in `PORT` değerinde ve `0.0.0.0` adresinde dinler. `/api/health` sağlık kontrolü için kullanılır. API anahtarı gerekmez.

Yerel üretim kontrolü:

```sh
npm run build:railway
PORT=3000 npm run start:railway
```
