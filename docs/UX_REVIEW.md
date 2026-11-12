# Şimdi Açık — kullanılabilirlik değerlendirmesi
12 Kasım 2026

## Kanıt sınırı
Gerçek müşteri görüşmesi yapılmadı. GA4 raporları, ziyaretçi oturumları, cihaz dağılımı ve dönüşüm oranları bu oturumda erişilebilir değil. Kodda izinle çalışan GTM kurulumu görüldü; bu, rapor verilerinin doğrulandığı anlamına gelmez. Aşağıdaki kararlar sezgisel değerlendirme ve yayımlanmış araştırmalara dayanır; kullanıcı testi sonucu değildir. Canlı sayfa bu incelemede web okuyucusunda açılamadı; önceki oturumdaki ekran gözlemi ve mevcut kaynak kod kullanıldı.

## İncelenen kaynaklar
- NHS Find a pharmacy: https://www.nhs.uk/service-search/pharmacy/find-a-pharmacy — doğrudan şehir/posta kodu ve mevcut konum ile arama.
- NHS buttons: https://service-manual.nhs.uk/design-system/components/buttons — işlem hiyerarşisi, anlaşılır işlem adları ve küçük ekran hedefleri.
- Nielsen Norman Group: https://www.nngroup.com/articles/how-people-read-online/ — beş göz izleme çalışmasının sentezi; metnin taranabilirliği.
- DWP Find an address: https://design-system.dwp.gov.uk/patterns/find-an-address — iyi arayüzün, zayıf konum bulma performansını tek başına çözememesi.

## Görev varsayımları
1. Konum izni vermeden il/ilçe seçebilmek.
2. Yakındaki nöbet kaydının adını, mesafesini ve adresini karşılaştırmak.
3. Telefonla teyit etmek ve yol tarifi açmak.
4. Konum veya kaynak başarısızsa alternatif yola ulaşmak.
Bunların kullanıcı kitlesindeki sıklığı ölçülmedi.

## Bulgular ve değişiklikler
- Slogan ve dekoratif harita, girişte göreve hizmet etmiyor: kaldırıldı; doğrudan “Nöbetçi eczane bul” başlığı kullanıldı.
- Renkli, iri, ayrı kartlar sonuç taramasını bölüyor: tek liste yüzeyinde ayırıcılarla düzenlendi.
- Fazla kalın yazı ve rozetler benzer öneme sahip görünüyor: adlar 600 ağırlık, adresler normal ağırlık, nöbet durumu küçük düz metin.
- Tekrarlanan kuvvetli işlem düğmeleri: yol tarifi belirgin, telefon işlemi ikincil. İki işlem de görünür ve erişilebilir.
- Dekoratif sıcak/kırmızı tema: nötr yüzeyler, lacivert metin ve tek mavi işlem rengi; kırmızı yalnızca hata durumu için.
- Filtrelerin işlevi korunuyor; dokunma hedefleri mobilde en az 44px. Sonuç sayısı ve kaynak zamanı görünür.
- Kaynak uyarısının ayrıntıları açılır alanda korunuyor; eksik kayıtlar gizlice yok sayılmıyor.

## Ölçülmesi gerekenler — henüz doğrulanmadı
Analitik erişimi olduğunda 28 günlük mobil/masaüstü dağılımı, giriş sayfaları, konum seçiminden sonuca geçiş, boş/hatalı sonuç oranı ve ara/yol tarifi etkileşimleri incelenmeli. Tıklama, gerçek telefon görüşmesi veya varış olarak yorumlanmamalı.
5 gerçek kullanıcıyla görev testi: izin reddiyle bölge seçme, sonuç karşılaştırma, telefon bulma ve yol tarifi açma. Tamamlama, hata ve anlaşılmayan ifadeler kaydedilmeli. Hassas sağlık bilgisi, aranan ilaç ve kesin konum analitiğe eklenmemeli.
