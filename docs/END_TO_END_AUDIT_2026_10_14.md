# Şimdi Açık — uçtan uca kontrol, 14 Ekim 2026

İncelenen canlı taban: `b3be8b1696ec14bce7c4bce030d8b7511fcbcff4`. Sonraki tasarım değişiklikleri korunarak kontrol edildi.

## Düzeltilenler

- Şehir rehberinden yapılan ilçe seçimi tek kullanımlık, en fazla 60 saniyelik sekme içi kayıtla ana sayfaya taşınır. Aynı ilçe için gereksiz ikinci ters adres sorgusu kaldırıldı. Depolama engelliyse koordinat akışı alternatif olarak korunur.
- React geliştirme modundaki çift başlangıçta kayıt erken tüketilmez; eski kayıtlar reddedilir.
- Alt sayfalardaki Haritada göster ve İl/ilçe seç eylemleri ana sayfada ilgili görünümü açar.
- Şehir sayfasındaki GPS isteği ortak, sınırlı tekrar deneyen akışı kullanır; sayfa kapandıktan sonra geç gelen sonuç yönlendirme yapmaz.
- Çerez politikası içindeki tercih düğmesi geri getirildi; kullanılmayan import uyarısı giderildi.
- Şehir başlıklarında yinelenen “Şimdi Açık” kaldırıldı. Statik şehir sayfasındaki canlı doğrulama izlenimi ve tüm eczaneler için kesin 24 saat/08:30 iddiaları kaldırıldı.
- Footer içindeki TEB onayı, reklamsızlık ve saniyeler içinde erişim iddiaları doğrulanabilen metinlerle değiştirildi. Tasarım sınıfları korundu.

## Doğrulama

- 125 otomatik test: tamamı başarılı. Yeni testler sekmeler arası değil aynı sekmede tek kullanımlık bölge geçişini, tekrar okumayı ve geçersiz/gelecek/eski kaydı kapsar.
- ESLint: hata ve uyarı yok. Next.js üretim derlemesi ve TypeScript kontrolü başarılı.
- Üretim bağımlılıkları güvenlik taraması: raporlanan açık yok. Bu, uygulamanın tüm güvenlik risklerinin bittiği anlamına gelmez.
- 375 px mobil tarayıcı: Ankara → Çankaya → 13 güncel kayıt; seçilen bölge doğru taşındı. Aramayla sıfır sonuç ve filtreleri temizleyerek geri dönüş çalıştı. Google etiketleri analitik izni olmadan yüklenmedi.
- Çerez politikasındaki tercih düğmesi izin panelini açtı.
- Canlı `www` 301 yönlendirmesi sayfa ve sorgu parametrelerini koruyor. Canonical alan adı `https://simdiacik.com`.

## Dış bağımlılıklar ve sınırlar

Dokuz il için doğrudan veri sağlayıcısı vardır; diğer iller resmî oda bağlantılarına yönlendirilir. Resmî kaynakların erişimi ve nöbet tarihi her istekte doğrulanır. 14 Ekim sabahı canlı kontrolde İzmir, Samsun/Sinop ve Gaziantep kaynakları doğrulanamadı; bu durum boş listeye veya eski kayda çevrilmedi. Kaynağın erişimi/tarih bilgisini doğrulamak saha teyidinin yerine geçmez.

KVKK veri sorumlusu resmî unvan/adres bilgisi ve veri kaynaklarının yeniden yayın lisansı dış teyit gerektirir. Gerçek cihazlarla VoiceOver/TalkBack ve saha çalışması yapılmış gibi raporlanmaz.
