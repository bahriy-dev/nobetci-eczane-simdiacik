import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteMark } from '@/components/site-mark';
import { SiteFooter } from '@/components/site-footer';
import { siteOrigin, ogImage } from '@/lib/site-config';
const title = 'Nöbetçi Eczane Veri Kaynakları ve Güncellik';
const description = 'Şimdi Açık nöbetçi eczane bilgilerini nasıl sunar? Veri kaynakları, son kontrol zamanı, eksik kayıtlar ve yanlış bilgi bildirme yöntemi.';
export const metadata: Metadata = { title, description, alternates: { canonical: '/veri-kaynaklari' }, openGraph: { title, description, url: siteOrigin + '/veri-kaynaklari', images: [ogImage] }, twitter: { title, description } };
export default function SourcesPage() {
  return <><header className="header"><SiteMark /><Link className="legal-back" href="/">Eczane bul</Link></header><main className="legal-main"><div className="legal-title"><span>VERİ VE GÜNCELLİK</span><h1>Nöbetçi eczane bilgileri nereden geliyor?</h1><p>Kaynağı, kontrol zamanını ve bilginin sınırlarını birlikte gösteriyoruz.</p></div><article className="legal-article guide-article">
    <section><h2>Kaynaklar ve kapsam</h2><p>Şimdi Açık, eczacı odaları ve belediyelerin yayımladığı nöbet listeleri ile yapılandırılmış nöbet verisi sağlayıcılarından yararlanır. Kullanılan kaynak ile son kontrol zamanı şehir listesinin yanında gösterilir. Her kaynak ve il aynı kapsamda veri sağlamayabilir.</p><p>Resmî listeyi doğrudan kontrol etmek için şehir sayfasındaki kaynak bağlantısını veya <a href="https://www.teb.org.tr/odalar" target="_blank" rel="noreferrer">Türk Eczacıları Birliği eczacı odaları dizinini</a> kullanabilirsiniz. Şimdi Açık bağımsız bir hizmettir; bir kamu kurumu veya eczacı odası değildir.</p></section>
    <section><h2>Son kontrol zamanı ne anlama gelir?</h2><p>Bu zaman, uygulamanın kaynaktan bilgiyi aldığı zamanı belirtir. Eczanenin kapısının o anda açık olduğunun yerinde doğrulandığı anlamına gelmez. Nöbet başlangıcı ve bitişi yalnızca kaynakta mevcutsa gösterilir; önbellekteki verinin zamanı yeniymiş gibi değiştirilmez.</p></section>
    <section><h2>Gece yarısından sonra hangi listeye bakmalıyım?</h2><p>Nöbet gece yarısını aşabilir. Takvim tarihi değişse bile bir önceki akşam başlayan nöbet devam edebilir. Kaydın nöbet tarihini ve varsa bitiş saatini kontrol edin. Yola çıkmadan önce eczaneyi arayarak nöbeti teyit edin.</p></section>
    <section><h2>Liste boşsa veya eksikse</h2><p>Veri kaynağı yanıt vermediğinde, kayıt doğrulanamadığında veya kaynak erişimi sınırlı olduğunda liste gösterilemeyebilir. Bu, o ilde nöbetçi eczane bulunmadığı anlamına gelmez. Kapsam uyarılarını okuyun ve şehir sayfasındaki resmî liste bağlantısını açın.</p></section>
    <section><h2>Adres, harita ve ilaç stokları</h2><p>Haritadaki işaret kaynaktan gelen koordinata veya adresten hesaplanan konuma dayanabilir. Kesin giriş noktasını adres ve telefonla doğrulayın. İlaç stok durumunu göstermiyoruz; stok bilgisini eczaneden öğrenebilirsiniz.</p></section>
    <section><h2>Yanlış bilgi nasıl bildirilir?</h2><p>İl, ilçe, eczane adı, hatalı bilgi ve gördüğünüz zamanı <a href="mailto:info@simdiacik.com">info@simdiacik.com</a> adresine iletebilirsiniz. Reçete, kimlik veya sağlık bilgisi göndermeyin. Nöbet değişikliğinin resmî kaynağa da bildirilmesi gerekebilir.</p></section>
    <section><h2>Şehir seçerek devam edin</h2><p><Link href="/nobetci-eczane-rehberi">81 il için nöbetçi eczane rehberi</Link> üzerinden bulunduğunuz şehrin kaynağını ve mevcut listesini inceleyin.</p></section>
  </article></main><SiteFooter /></>;
}
