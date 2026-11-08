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
import { siteOrigin, ogImage } from "@/lib/site-config";
import { CityGuideSearch } from "@/components/city-guide-search";
import { SiteFooter } from "@/components/site-footer";
import { notFound } from "next/navigation";
import { listRegions, type ProvinceDTO } from "@/lib/regions";
import { normalized, type PlacesResult } from "@/lib/places";
import { pharmacyProvider } from "@/lib/providers/pharmacies";
import {
  pharmacyDisplayAddress,
  pharmacyDisplayName,
  pharmacyPhoneDisplay,
  pharmacyPhoneLink,
  pharmacyTimestamp,
} from "@/lib/pharmacy-presentation";

// Each guide carries today's duty list in its HTML (for people and search engines). Pages are made on
// first request and refreshed at most every 15 minutes, never at build time (no source calls in builds).
export const revalidate = 900;
export function generateStaticParams() {
  return [] as { city: string }[];
}

/** Today's official duty list for the province, or null when no source answers (the page still renders). */
async function todaysDuty(name: string): Promise<PlacesResult | null> {
  try {
    const provinces = (await listRegions()).regions as ProvinceDTO[];
    const province = provinces.find(
      (row) => normalized(row.name) === normalized(name),
    );
    if (!province) return null;
    return await pharmacyProvider.search({
      city: province.name,
      lat: province.lat,
      lng: province.lng,
      radius: 2000,
      category: "Eczane",
      query: "",
      demo: false,
    });
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city: slug } = await params;
  const city = getCityGuide(slug);
  if (!city) return {};
  const title = `${city.name} Nöbetçi Eczaneler — Bugün Açık Eczaneler | Şimdi Açık`;
  const description = `${city.name} bugün ve bu gece nöbetçi eczaneler: adres, telefon ve harita. Liste resmî nöbet kaynaklarından alınır; gitmeden önce telefonla teyit et.`;
  const canonical = `/nobetci-eczane/${city.slug}`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    openGraph: {
      images: [ogImage],
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
  if (!city) notFound();
  const duty = await todaysDuty(city.name);
  const dutyPlaces = duty?.places.slice(0, 150) ?? [];

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
    ...(dutyPlaces.length
      ? {
          mainEntity: {
            "@type": "ItemList",
            name: `${city.name} bugün nöbetçi eczaneler`,
            numberOfItems: dutyPlaces.length,
            itemListElement: dutyPlaces.map((place, index) => ({
              "@type": "ListItem",
              position: index + 1,
              item: {
                "@type": "Pharmacy",
                name: pharmacyDisplayName(place.name),
                address: pharmacyDisplayAddress(place.address),
                ...(place.phone ? { telephone: place.phone } : {}),
                geo: {
                  "@type": "GeoCoordinates",
                  latitude: place.lat,
                  longitude: place.lng,
                },
              },
            })),
          },
        }
      : {}),
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
      a: city.live
        ? `Liste resmî nöbet kaynaklarından otomatik alınsa da nöbet yerini ve ihtiyaç duyduğunuz ilacın stokta olduğunu doğrulamak için gitmeden önce telefonla aramanız tavsiye edilir.`
        : `${city.source.name} nöbet listesini yalnızca kendi sayfasında yayımlıyor. Listeyi oradan açın ve gitmeden önce eczaneyi telefonla arayarak doğrulayın.`,
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
            {city.live
              ? `${city.name} genelinde bugün ve bu gece nöbetçi olan eczaneleri harita üzerinde bulun, telefonla arayarak teyit edin ve yol tarifi alın.`
              : `${city.name} için resmî nöbet listesi yalnızca kaynağın kendi sayfasında yayımlanıyor. Aşağıdaki bağlantıdan güncel listeyi açabilirsiniz.`}
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

        {/* Today's list, rendered on the server */}
        <section className="city-duty" aria-labelledby="city-duty-title">
          <h2 id="city-duty-title">{city.name} bugün nöbetçi eczaneler</h2>
          {dutyPlaces.length ? (
            <>
              <p className="city-duty-meta">
                {dutyPlaces.length} eczane · Kaynak: {duty!.source} · Son
                kontrol {pharmacyTimestamp(duty!.fetchedAt)}. Gitmeden önce
                telefonla teyit et.
              </p>
              <ol className="city-duty-list">
                {dutyPlaces.map((place) => (
                  <li key={place.id}>
                    <strong>{pharmacyDisplayName(place.name)}</strong>
                    <span>{pharmacyDisplayAddress(place.address)}</span>
                    {place.phone && (
                      <a href={pharmacyPhoneLink(place.phone)}>
                        {pharmacyPhoneDisplay(place.phone)}
                      </a>
                    )}
                    {place.closes && (
                      <small>
                        Nöbet bitişi: {pharmacyTimestamp(place.closes)}
                      </small>
                    )}
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <p className="city-duty-meta">
              Bugünün listesi şu an alınamadı. Güncel liste için{" "}
              <a href={city.source.url} target="_blank" rel="noreferrer">
                {city.source.name}
              </a>{" "}
              sayfasını aç.
            </p>
          )}
        </section>

        {/* Search & Location Card (only where the site has the live list) */}
        {city.live && <CityGuideSearch city={city.name} />}

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
          aria-label="Diğer iller"
        >
          <h2>Diğer İller</h2>
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
