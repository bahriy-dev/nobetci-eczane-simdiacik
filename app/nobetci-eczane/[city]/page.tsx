import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronRight,
  Clock,
  PhoneCall,
  Plus,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { cityGuides, getCityGuide } from "@/lib/city-guides";
import { siteOrigin } from "@/lib/site-config";
import { CityGuideSearch } from "@/components/city-guide-search";
import { SiteFooter } from "@/components/site-footer";

export const dynamicParams = false;
export function generateStaticParams() {
  return cityGuides.map((city) => ({ city: city.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city: slug } = await params;
  const city = getCityGuide(slug);
  if (!city) return {};
  const title = `${city.name} Nöbetçi Eczaneler | Şimdi Açık`;
  const description = `${city.name} için güncel nöbetçi eczane kaynağına ulaş. İlçe veya konum seç, yakındaki eczaneleri haritada gör ve gitmeden önce telefonla teyit et.`;
  const canonical = `/nobetci-eczane/${city.slug}`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      locale: "tr_TR",
      url: siteOrigin + canonical,
      siteName: "Şimdi Açık",
      title,
      description,
    },
  };
}

export default async function CityGuidePage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city: slug } = await params;
  const city = getCityGuide(slug);
  if (!city) return null;

  const canonical = siteOrigin + `/nobetci-eczane/${city.slug}`;
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": canonical + "#webpage",
    url: canonical,
    name: `${city.name} nöbetçi eczaneler`,
    inLanguage: "tr-TR",
    isPartOf: { "@id": siteOrigin + "/#website" },
    about: {
      "@type": "City",
      name: city.name,
      containedInPlace: { "@type": "Country", name: "Türkiye" },
    },
  };

  const otherCities = cityGuides.filter((item) => item.slug !== city.slug);

  const cityFaqs = [
    {
      q: `${city.name} nöbetçi eczaneleri saat kaça kadar açık?`,
      a: `Nöbet başlangıç ve bitiş saatleri il, ilçe ve tarihe göre değişebilir. Seçtiğiniz eczanenin resmî nöbet kaydını kontrol edin ve gitmeden önce telefonla teyit edin.`,
    },
    {
      q: "İlaç stok durumunu bu siteden görebilir miyim?",
      a: "Sitede ilaç stok bilgisi sunulmuyor. İhtiyacınız olan ürünün bulunup bulunmadığını eczaneyi telefonla arayarak öğrenebilirsiniz.",
    },
    {
      q: "Eczanenin adresine nasıl yol tarifi alabilirim?",
      a: "Eczane kartındaki Yol tarifi bağlantısı, seçilen eczanenin konumunu harita uygulamasında açar. Yolculuk süresi ve güzergâh bilgisi harita uygulaması tarafından sağlanır.",
    },
    {
      q: "Yola çıkmadan önce eczaneyi telefonla aramak neden önerilir?",
      a: `Nöbet listeleri resmî ${city.source.name} kayıtlarından güncellense de acil durumlarda ihtiyaç duyulan ilacın eczane stoklarında bulunduğunu ve nöbet yerini doğrulamak amacıyla gitmeden önce telefonla aramanız tavsiye edilir.`,
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
        }}
      />
      <header className="header city-guide-header">
        <Link className="brand" href="/" aria-label="Şimdi Açık ana sayfa">
          <span className="brand-icon" aria-hidden="true">
            <Plus size={25} strokeWidth={3} />
          </span>
          <span className="brand-name">
            şimdi<span>açık</span>
            <small>NÖBETÇİ ECZANE</small>
          </span>
        </Link>
        <div className="header-actions">
          <Link className="legal-back" href="/">
            <ArrowLeft size={15} />
            Ana sayfa
          </Link>
        </div>
      </header>

      <main className="city-guide-main">
        {/* Breadcrumb */}
        <nav className="city-guide-breadcrumb" aria-label="Sayfa yolu">
          <Link href="/">Ana sayfa</Link>
          <ChevronRight size={13} aria-hidden="true" />
          <Link href="/nobetci-eczane-rehberi">Rehber</Link>
          <ChevronRight size={13} aria-hidden="true" />
          <span aria-current="page">{city.name}</span>
        </nav>

        {/* Hero Section */}
        <section className="city-hero">
          <div className="city-hero-badge">
            <span className="live-dot" aria-hidden="true" />
            <span>Nöbetçi Eczane Rehberi</span>
            <span>•</span>
            <span>{city.name}</span>
          </div>

          <h1 className="city-hero-title">{city.name} Nöbetçi Eczaneleri</h1>

          <p className="city-hero-description">
            {city.name} genelinde bugün ve bu gece nöbetçi olan eczaneleri
            harita üzerinde bulun, telefonla arayarak çalışma durumunu teyit
            edin ve harita uygulamasından yol tarifi alın.
          </p>

          <div className="city-hero-source-pill">
            <ShieldCheck size={16} />
            <span>
              Resmî nöbet listesi: <strong>{city.source.name}</strong>
            </span>
            <a
              href={city.source.url}
              target="_blank"
              rel="noreferrer"
              title="Resmî nöbet listesini aç"
            >
              Aç <ArrowUpRight size={13} />
            </a>
          </div>
        </section>

        {/* Search & Location Card */}
        <CityGuideSearch city={city.name} />

        {/* Trust & Safety Cards Grid */}
        <section
          className="city-trust-grid"
          aria-label="Nöbetçi eczane önemli bilgiler"
        >
          <div className="city-trust-card">
            <span className="city-trust-icon">
              <Clock size={20} />
            </span>
            <h3>Nöbet Çalışma Saatleri</h3>
            <p>
              Nöbet saatleri bölgeye ve tarihe göre değişir. Başlangıç ve bitiş
              bilgilerini resmî listeden ve eczaneyi arayarak doğrulayın.
            </p>
          </div>

          <div className="city-trust-card">
            <span className="city-trust-icon">
              <PhoneCall size={20} />
            </span>
            <h3>Telefonla Teyit Önerisi</h3>
            <p>
              Nöbetçi eczaneye gitmeden önce listedeki numarayı arayarak
              aradığınız ilacın stok durumunu sormanız acil durumlarda zaman
              kazandırır.
            </p>
          </div>

          <div className="city-trust-card">
            <span className="city-trust-icon">
              <ShieldAlert size={20} />
            </span>
            <h3>Acil Durumlarda 112</h3>
            <p>
              Hayati tehlike ve acil tıbbi müdahale gerektiren durumlarda vakit
              kaybetmeden 112 Acil Çağrı Merkezi’ni arayınız.
            </p>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="city-faq-section" aria-labelledby="city-faq-title">
          <h2 id="city-faq-title">
            {city.name} Nöbetçi Eczaneleri Hakkında Sıkça Sorulanlar
          </h2>
          <div className="city-faq-list">
            {cityFaqs.map((faq, i) => (
              <div key={i} className="city-faq-item">
                <h3>{faq.q}</h3>
                <p>{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Related Cities Navigation */}
        <nav
          className="city-guide-related"
          aria-label="Diğer desteklenen iller"
        >
          <h2>Diğer Desteklenen İller</h2>
          <div className="city-related-grid">
            {otherCities.map((item) => (
              <Link
                href={`/nobetci-eczane/${item.slug}`}
                key={item.slug}
                className="city-related-card"
              >
                <span>{item.name}</span>
                <ChevronRight size={16} />
              </Link>
            ))}
          </div>
        </nav>
      </main>

      <SiteFooter sourceUrl={city.source.url} />
    </>
  );
}
