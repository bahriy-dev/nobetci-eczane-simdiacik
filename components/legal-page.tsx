import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { legalDocuments, legalLinks } from "@/lib/legal-content";
import { CookieSettingsButton } from "@/components/cookie-settings-button";
import { SiteFooter } from "@/components/site-footer";
import { SiteMark } from "@/components/site-mark";
export function LegalPage({ documentKey }: { documentKey: string }) {
  const doc = legalDocuments[documentKey];
  return (
    <>
      <header className="header legal-header">
        <SiteMark />
        <Link className="legal-back" href="/">
          <ArrowLeft size={16} />
          Eczane bul
        </Link>
      </header>
      <main className="legal-main">
        <div className="legal-title">
          <span>BİLGİ VE POLİTİKALAR</span>
          <h1>{doc.title}</h1>
          <p>{doc.intro}</p>
          <small>Son güncelleme: 13 Ekim 2026</small>
        </div>
        <div className="legal-layout">
          <nav className="legal-nav" aria-label="Politika sayfaları">
            {legalLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                aria-current={
                  link.href === "/" + documentKey ? "page" : undefined
                }
              >
                {link.label}
              </a>
            ))}
          </nav>
          <article className="legal-article">
            {documentKey === "cerez-politikasi" && <CookieSettingsButton />}
            {doc.sections.map((section, index) => (
              <section key={section.title} id={"bolum-" + (index + 1)}>
                <h2>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {section.title}
                </h2>
                {section.text.map((text) => (
                  <p key={text}>
                    {text === "info@simdiacik.com" ? (
                      <a href="mailto:info@simdiacik.com">{text}</a>
                    ) : (
                      text
                    )}
                  </p>
                ))}
              </section>
            ))}
            {documentKey === "kvkk" && (
              <p className="legal-reference">
                Resmî bilgi:{" "}
                <a
                  href="https://www.kvkk.gov.tr/Icerik/2033/Aydinlatma-Yukumlulugu-"
                  target="_blank"
                  rel="noreferrer"
                >
                  KVKK aydınlatma yükümlülüğü <ArrowUpRight size={13} />
                </a>{" "}
                ve{" "}
                <a
                  href="https://www.kvkk.gov.tr/Icerik/2036/Ilgili-Kisinin-Haklari"
                  target="_blank"
                  rel="noreferrer"
                >
                  ilgili kişi hakları
                </a>
                .
              </p>
            )}
          </article>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
