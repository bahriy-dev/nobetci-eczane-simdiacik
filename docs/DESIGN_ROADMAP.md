# Şimdi Açık — Baştan sona tasarım yol haritası
Tarih: 12 Kasım 2026
Kaynak: bahriy-dev/nobetci-eczane-simdiacik, main @ f01fc496edb2497cf5fe84c162e594a2fafeedc3

## Tasarım fikri: Yakında bir ışık var
Sıcak beyaz (#f7f5f0), mürekkep (#24252a), eczane kırmızısı (#bc352d).
Geniş boşluklar, büyük başlıklar, sade numaralı eczane kartları.
Dekoratif harita çizgileri üzerinde eczane işareti giriş alanına özgü kimlik verir.
Kullanıcının işi: konum seç → eczaneyi bul → ara veya yol tarifi al.

## 1. Envanter ve koruma
- Ana sayfa, konum diyaloğu, filtreler, liste, Leaflet haritası, detay paneli.
- 81 şehir rehberi, bilgi rehberi, gizlilik/KVKK/çerez/iletişim, hata ve 404.
- API uçları, sağlayıcılar, gerçek nöbet bilgisi, kaynak uyarıları, canonical ve şema korunur.
- Üyelik veya başka ürün kapsamı eklenmez.

## 2. Tasarım sistemi
- signal.css bütün yüzeyler için renk, yazı, aralık ve bileşen kurallarını tanımlar.
- Eski design-refresh.css importu kaldırılır; globals.css mevcut temel davranışları taşır.
- Odak halkaları, en az 44px ana dokunma alanları, koyu tema, azaltılmış hareket desteği.
- 380 / 800 / 1050 / 1328px aralıklarında akışkan düzen.

## 3. Giriş ve konum
- Büyük, özgün başlık; kısa açıklama; iki belirgin işlem.
- Konumumu kullan ve il/ilçe seç.
- Popüler şehir bağlantıları; sahte eczane veya sahte canlılık bilgisi yok.
- Konum izni reddi, adres arama hatası, il/ilçe yüklenmesi mevcut gerçek akışla devam eder.

## 4. Sonuçlar ve harita
- Bölge, son kontrol zamanı ve sonuç sayısı açık bir hiyerarşide.
- Arama, mesafe ve sıralama aynı alanda; mobilde filtre paneli.
- Masaüstünde liste yanında yapışkan harita; mobilde liste/harita anahtarı.
- Eczane kartında ad, nöbet durumu, yaklaşık mesafe, adres, ara ve yol tarifi.
- Liste/harita seçimi ve numaraları eşleşir; hata, boş ve yüklenme durumları aynı sistemde.

## 5. Detay ve alt sayfalar
- Yeniden biçimlenen eczane paneli; telefon, adres, paylaşım ve kaynak.
- Şehir sayfalarında sade büyük başlık ve okunaklı nöbet listesi.
- Rehber/yasal sayfalarda tutarlı başlık ve metin sütunları.
- Footer: eczane bul, harita, şehir seç, yardım, resmî kaynak ve yasal bağlantılar.
- Kısa teyit bilgisi; aşırı tanıtım blokları kaldırılır.

## 6. Kabul kontrolleri
- Mevcut testler ve TypeScript kontrolü.
- Railway üretim derlemesi.
- 360, 390, 768, 1280 ve 1440px görsel kontrol; yatay taşma olmaması.
- Açık/koyu tema, klavye, diyalog odak geri dönüşü, mobil harita.
- Canlı kaynak gecikmesi/erişilememesi durumunda resmî liste bağlantıları.
- PR üzerinde değişiklikler ve doğrulama sınırları raporlanır.

## Araştırma
- https://github.com/Salma191/pharmacy-location — eczane bulucu ürün akışı.
- https://github.com/norbertvonpolyak/city-map-frontend — harita/yan panel ve konum arama düzeni.
Bu kaynakların README içerikleri incelendi; kod veya tasarım kopyalanmadı.
Stitch isteğe bağlı görsel referans olarak değerlendirildi; tarayıcı erişimi zaman aşımına uğradı.

## Uygulama durumu
- [x] Repo ve sayfa envanteri
- [x] Görsel yön ve tasarım sistemi
- [x] Giriş, şehir kısayolları ve üst menü
- [x] Sonuç listesi, harita ve eczane kartı görünümü
- [x] Konum, detay ve filtre paneli görünümü
- [x] Şehir, rehber ve yasal sayfa görünümü
- [x] Footer sadeleştirmesi
- [ ] Bağımlılık kurulumu, test ve üretim derlemesi
- [ ] Tarayıcıda görsel kontrol

## Bu oturumdaki doğrulama
- Değişen TSX dosyaları TypeScript 7 ile --noCheck --noEmit kullanılarak sözdizimi açısından kontrol edildi; hata yok.
- Tam tip kontrolü, test paketi ve üretim derlemesi tamamlanamadı: npm ci, registry.npmjs.org için ENOTFOUND verdi.
- Tarayıcı görüntü kontrolü tamamlanamadı: bilgisayar/tarayıcı erişimi zaman aşımına uğradı.
- Bu nedenle PR taslak olarak açılır; mevcut quality workflow tam doğrulamayı çalıştırabilir.
