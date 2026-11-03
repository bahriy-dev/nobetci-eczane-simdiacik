# Şimdi Açık

Yakınındaki nöbetçi eczaneyi bulmak, resmî nöbet kaynağını görmek, telefonla teyit etmek ve yol tarifi almak için Türkiye odaklı, mobil uyumlu uygulama. 81 ilin nöbet listesi lisanslı [Eczaneler.org API](https://eczaneler.org/nobetci-eczane-api) üzerinden gelir; anahtar tanımlı değilse uygulama resmî kaynaklarla sınırlı çalışır.

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

## Veri kaynakları ve sınırlar

**Birincil nöbet kaynağı (81 il):** Eczaneler.org v2 API (`https://api.eczaneler.org/api/v2`, yıllık lisans). Anahtar yalnızca sunucuda, `ECZANELER_API_KEY` ortam değişkeninde tutulur ve `X-Api-Key` başlığıyla gönderilir; tarayıcıya veya URL'ye yazılmaz. İl listesi `sentry-city-list/{plaka}` uç noktasından sayfa sayfa alınır ve sağlayıcının yenileme aralığıyla uyumlu olarak 10 dakika önbellekte tutulur. Her kaydın `sentry_date` alanı doğrulanır: önceki günün listesi yalnızca Türkiye saatiyle 09:00 nöbet devrine kadar kabul edilir, daha eski kayıtlar gösterilmez. Kartlardaki resmî liste bağlantısı ilgili eczacı odasının sayfasına gider.

Eczaneler.org yanıt vermezse aşağıdaki resmî kaynaklar yedek olarak denenir.

**İl/ilçe:** TurkiyeAPI v2, `https://api.turkiyeapi.dev/v2/provinces` ve `/v2/provinces/{id}/districts`. Bağımsız ve açık kaynak idari veri projesidir; eczane veya nöbet verisi içermez. İl koordinatları il merkezleridir; ilçelerin API'de koordinatı yoktur. İlçe konumu yalnızca kullanıcı bölgeyi kullanmayı seçince Nominatim üzerinden bulunur. Şema, il–ilçe ilişkisi, koordinatlar ve listenin bütünlüğü doğrulanır. Sunucu ve HTTP önbelleği beş dakikadır; sınırsız kullanım veya SLA varsayılmaz.

**Nöbetçi eczane:** Kodda aşağıdaki otomatik sağlayıcılar bulunur. Kaynak alınırken erişimi ve yanıtın güncelliği doğrulanır; bu liste sürekli erişim veya yayımlanan sürümde bütün kaynakların başarıyla çalıştığına dair bir garanti değildir.

| İl | Resmî kaynak ve yöntem |
| --- | --- |
| İstanbul, Yalova | Yedek yok. İstanbul Eczacı Odası Kasım 2026'da veri işlemini yalnızca kendi sitesine açtı; bu kısıtlama aşılmaz, resmî sayfa bağlantısı gösterilir. |
| Ankara | Ankara Eczacı Odası'nın tarihli `getPharmacies/YYYY-MM-DD` işlemi. |
| İzmir | İzmir Büyükşehir Belediyesi'nin belgelenmiş `https://openapi.izmir.bel.tr/api/ibb/nobetcieczaneler` uç noktası. Servis boş ya da hatalı dönerse İzmir Eczacı Odası'nın nöbet sayfası kullanılır. |
| Kayseri | Belediyenin [CBS nöbet sayfası](https://cbs.kayseri.bel.tr/kayseri-nobetci-eczaneler) ve aynı sayfanın harita işlemi. Tarihli tablo ile harita kayıtları ad, adres, ilçe ve telefon üzerinden eşleştirilir. Ağ veya biçim hatasında belediyenin `https://acikveri.kayseri.bel.tr/api/kbb/eczane` açık veri kaynağı HTTPS üzerinden yedek olarak denenir. HTTP kullanılmaz; erişim reddi yedek istekle aşılmaz. |
| Konya | [Resmî nöbet sitesi](https://www.konyanobetcieczaneleri.com/) sayfada eczane adını, bölgesini ve nöbet saatini açıkça gösterir; adres ve telefonu ise ziyaret başına imzalı bir istekle yükler, o istek kullanılmaz. Konum, o ilçedeki tek ve aynı adlı OpenStreetMap eczane kaydından; yoksa ilçe merkezinden ("ilçe merkezine göre yaklaşık") alınır. Telefon yoktur; kart resmî sayfaya bağlanır. |
| Samsun, Sinop | [Samsun Eczacı Odası nöbet sayfası](https://www.samsuneczaciodasi.org.tr/nobetci-eczaneler). İller sayfanın açıkça ayrı yayımladığı Samsun ve Sinop bölümlerinden seçilir. |
| Gaziantep | [Gaziantep Büyükşehir Belediyesi nöbet sayfası](https://www.gaziantep.bel.tr/tr/nobetci-eczaneler). Tarih seçimi ve her kartın kendi telefon, adres ve harita koordinatı doğrulanır. |
| Adana, Adıyaman, Afyonkarahisar, Ağrı, Aksaray, Antalya, Ardahan, Artvin, Aydın, Balıkesir, Bartın, Batman, Bayburt, Bilecik, Bitlis, Bolu, Burdur, Bursa, Çanakkale, Çankırı, Çorum, Denizli, Diyarbakır, Düzce, Erzincan, Erzurum, Eskişehir, Gümüşhane, Hakkari, Hatay, Iğdır, Isparta, Kahramanmaraş, Karabük, Kars, Kastamonu, Kırklareli, Kırşehir, Kocaeli, Kütahya, Manisa, Mardin, Mersin, Muğla, Muş, Nevşehir, Niğde, Osmaniye, Sakarya, Siirt, Sivas, Şırnak, Tekirdağ, Trabzon, Van, Yozgat, Zonguldak | İlgili eczacı odasının herkese açık `nöbetçi eczaneler` sayfası (`lib/providers/chamber-pages.ts`). Kullanılan yollar sitelerin robots.txt kurallarınca serbesttir. Kayıtlar ortak bir desenle okunur: ad, adres, telefon ve koordinatlı harita bağlantısı. Sayfanın tarihi başlıktan ya da platformun tarih seçicisinden okunur ve güncel nöbet günü değilse liste gösterilmez. Kayıt kendi nöbet aralığını yazıyorsa bitmiş kayıtlar elenir; gündüz yayımlanan akşam nöbetleri (ör. 18:30 → sabah) "Nöbet başlangıcı" etiketiyle gösterilir, 10 saatten uzak başlangıçlar ve bitişi 24 saatten uzak kayıtlar sonraki güne ait sayılıp elenir. Yalnız saat yazan bitişler ("SAAT 23:59'A KADAR") sayfanın nöbet gününe bağlanır. Birden çok ile hizmet veren odalarda kayıt önce başlığındaki ya da altındaki ilçe adıyla iline atanır; ilçe adı iki ilde de geçiyorsa (ör. "Merkez") ya da yoksa en yakın il merkezi belirler. Odaların il plakalı sayfaları (`/nobetci-eczaneler/61` gibi) varsa onlar kullanılır. Bu sitelerin bir kısmı aynı sunucuda çalışır ve yoğun isteği reddeder; her sayfa en fazla 10 dakikada bir alınır, 403/429 yanıtından sonra 30 dakika hiç istenmez. |
| Malatya, Uşak, Tokat (merkez) | Oda sayfaları harita konumu vermez. Adres OpenStreetMap Nominatim ile konumlanır (`lib/geocode.ts`): önce aynı adlı OSM eczane kaydı, ancak sokağı ya da mahallesi oda adresiyle örtüşüyorsa; yoksa adresteki sokak ya da mahalle, ancak tek ve il merkezine uygun bir sonuç varsa. Bulunamayan kayıt gösterilmez. Kartta "yaklaşık konum" yazar, yol tarifi bu kayıtlarda adresle aranır. Nominatim kuralına uygun olarak tüm sunucu saniyede en fazla bir istek atar (`lib/nominatim.ts`) ve bulunan konumlar bir hafta saklanır. Tokat sayfası tarihli bir çizelgedir; yalnızca güncel günün satırı okunur. |
| Şanlıurfa, Giresun | Odaların kendi sitelerinin kullandığı herkese açık JSON uç noktaları (Şanlıurfa: `portal.sanliurfaeo.birodam.org.tr/.../duty-rosters/list-grouped`, Giresun: `giresuneczaciodasi.org.tr/api/pharmacies`). Her kayıt kendi başlangıç saatini ya da saat aralığını taşır; iki etkin nöbet günü birlikte okunur. Koordinatı olmayan kayıtlar adresten konumlanır. |
| Ordu | Odanın sayfasına gömdüğü 19 ilçe listesi (`ordu.eczanesistemi.net/list/700–718`). Sayfalar birlikte istenir; yaklaşık 7 saniyede gelmeyen ilçe uyarıyla dışarıda kalır ve bir sonraki aramada görünür. Aynı nöbet günü içinde alınmış kopya, sunucu yavaşken hemen kullanılır. |
| Elazığ, Bingöl, Tunceli | Elazığ Eczacı Odası sayfasının herkese açık arama formu (tarih + tüm ilçeler) tek istekle üç ilin listesini verir; kayıtlar ilçe adıyla iline atanır. |
| Kilis | Gaziantep Eczacı Odası JSON kaynağındaki `il: KİLİS` satırları. |
| Karaman, Edirne, Rize | Oda nöbet sayfaları; Karaman ve Rize'de yalın eczane adları ve tarih biçimleri sayfaya özgü küçük dönüştürücülerle okunur. |

Oda ve belediye web işlemleri halka açık resmî kaynaklardır; belgelenmiş ticari API sözleşmesi veya açık veri lisansı oldukları varsayılmaz. Kayseri'nin özgün açık veri kümesi CC BY 4.0 olarak yayımlanmıştır; bu lisans CBS web sayfasına veya diğer kaynaklara genellenmez. Biçim, tarih veya erişim doğrulanamazsa eski ya da örnek kayıt gösterilmez. Nöbet listeleri sabah devrinden (08:00–09:00) ertesi sabaha kadar sürer ve başladıkları günün tarihini taşır; bu yüzden önceki günün listesi Türkiye saatiyle 09:00'a kadar geçerli kabul edilir (`lib/duty-day.ts`). `npm run audit:coverage` 81 ili ve ilçelerini uygulamanın gerçekten sunduğu veriyle denetler.

**81 il için resmî yönlendirme:** TEB'nin oda rehberi il–oda eşleşmesini sağlar. Otomatik sağlayıcı bulunmayan veya güncel liste alınamayan yerde doğrulanmış nöbet sayfası, ilgili eczacı odası sitesi ya da TEB rehberi bağlantısı gösterilir. Bir odanın birden çok ile hizmet vermesi, o illerin otomatik veri kapsamına girdiği anlamına gelmez. Genel eczane kayıtları nöbetçi eczane olarak gösterilmez.

**Harita ve adres:** Leaflet, OpenStreetMap harita katmanları ve Nominatim. Kullanıcı adres aramasını gönderince konum sorgulanır; otomatik adres tamamlama yapılmaz. Atıf görünürdür. Kamu servislerinin adil kullanım sınırları uygulanır; ücretsiz veri kullanımı sınırsız kapasite garantisi değildir.

“Nöbet listesinde” olmak, eczanenin o anda hizmet verdiğinin telefonla teyit edildiği anlamına gelmez. Kaynak ve veri alınma zamanı sunucu veri modelinde doğrulanır. Nöbet doğrulaması en fazla beş dakika geçerlidir. Tarih veya nöbet aralığına göre sınır uygulayan sağlayıcılarda bu süre daha kısa olabilir. Yola çıkmadan önce eczaneyi aramak gerekir.

## Yerel çalıştırma

Node.js 22.13+ ve npm gerekir. Nöbet listesinin 81 ilde gelmesi için `.env.local` dosyasına `ECZANELER_API_KEY` yazılır (bkz. `.env.example`).

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

Depoda `railway.json` bulunur. Railway servisini bu GitHub deposuna bağlayınca derleme komutu `npm run build:railway`, başlatma komutu `npm run start:railway` olarak uygulanır. Node sunucusu Railway'in `PORT` değerinde ve `0.0.0.0` adresinde dinler. `/api/health` sağlık kontrolü için kullanılır. Railway servisinin Variables bölümüne `ECZANELER_API_KEY` eklenmelidir.

Yerel üretim kontrolü:

```sh
npm run build:railway
PORT=3000 npm run start:railway
```
