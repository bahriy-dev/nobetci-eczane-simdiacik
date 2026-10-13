'use client';

import Link from 'next/link';
import { useState } from 'react';
import { legalLinks } from '@/lib/legal-content';
import {
  Plus,
  ChevronDown,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  PhoneCall,
  Mail,
  ArrowUp
} from 'lucide-react';

type Props = {
  sourceUrl: string;
  onDiscover: () => void;
  onMap: () => void;
  onLocation: () => void;
  onHelp: () => void;
};

export function SiteFooter({
  sourceUrl,
  onDiscover,
  onMap,
  onLocation,
  onHelp
}: Props) {
  const [open, setOpen] = useState<string | null>(null);

  const toggleGroup = (key: string) => {
    setOpen(prev => (prev === key ? null : key));
  };

  const scrollToTop = (e: React.MouseEvent) => {
    e.preventDefault();
    const anchor = document.getElementById('eczaneler');
    if (anchor) {
      anchor.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer className="site-footer pharmacy-main">
      {/* Üst Güven ve Acil Durum Bilgilendirme Kartları */}
      <div className="footer-highlights" aria-label="Güven ve acil durum bilgilendirmesi">
        <div className="highlight-item">
          <span className="highlight-icon">
            <ShieldCheck size={19} />
          </span>
          <div className="highlight-text">
            <b>Resmî Teyitli Bilgi</b>
            <p>Eczacı Odaları ve TEB onaylı nöbetçi listeleridir.</p>
          </div>
        </div>

        <div className="highlight-item">
          <span className="highlight-icon">
            <Zap size={19} />
          </span>
          <div className="highlight-text">
            <b>Hızlı & Reklamsız</b>
            <p>Üyeliksiz, anında konumla en yakın eczaneye ulaş.</p>
          </div>
        </div>

        <div className="highlight-item emergency">
          <span className="highlight-icon emergency">
            <PhoneCall size={19} />
          </span>
          <div className="highlight-text">
            <b>Acil Durumlarda 112</b>
            <p>Hayati acil durumlarda vakit kaybetmeden 112’yi arayın.</p>
          </div>
        </div>
      </div>

      {/* Ana Navigasyon Kolonları */}
      <div className="footer-grid">
        {/* Marka & Misyon */}
        <div className="footer-brand">
          <Link className="brand" href="/" aria-label="Şimdi Açık ana sayfa">
            <span className="brand-icon">
              <Plus size={22} strokeWidth={3} />
            </span>
            <span className="brand-name">
              şimdi<span>açık</span>
              <small>NÖBETÇİ ECZANE</small>
            </span>
          </Link>
          <p className="brand-description">
            Acil ilaç ve sağlık ihtiyaçlarında, bulunduğun konuma en yakın nöbetçi eczaneye saniyeler içinde güvenle ulaş.
          </p>
          <div className="footer-contact">
            <a href="mailto:info@simdiacik.com" className="footer-email-link" title="E-posta ile bize ulaşın">
              <Mail size={15} />
              <span>info@simdiacik.com</span>
            </a>
          </div>
        </div>

        {/* Eczaneni Bul */}
        <div className="footer-group" data-open={open === 'find'}>
          <h3>Eczaneni Bul</h3>
          <button
            type="button"
            className="footer-toggle"
            aria-expanded={open === 'find'}
            aria-controls="footer-find-links"
            onClick={() => toggleGroup('find')}
          >
            <span>Eczaneni Bul</span>
            <ChevronDown size={18} />
          </button>
          <nav id="footer-find-links" className="footer-links" aria-label="Eczane bağlantıları">
            <a href="#eczaneler" onClick={onDiscover}>
              Nöbetçi eczaneler
            </a>
            <button type="button" onClick={onMap}>
              Haritada göster
            </button>
            <button type="button" onClick={onLocation}>
              İl ve ilçe seç
            </button>
            <Link href="/nobetci-eczane/istanbul">İstanbul eczaneleri</Link>
            <Link href="/nobetci-eczane/ankara">Ankara eczaneleri</Link>
            <Link href="/nobetci-eczane/izmir">İzmir eczaneleri</Link>
          </nav>
        </div>

        {/* Bilgi & Yardım */}
        <div className="footer-group" data-open={open === 'help'}>
          <h3>Bilgi ve Yardım</h3>
          <button
            type="button"
            className="footer-toggle"
            aria-expanded={open === 'help'}
            aria-controls="footer-help-links"
            onClick={() => toggleGroup('help')}
          >
            <span>Bilgi ve Yardım</span>
            <ChevronDown size={18} />
          </button>
          <nav id="footer-help-links" className="footer-links" aria-label="Bilgi ve yardım">
            <button type="button" onClick={onHelp}>
              Nasıl kullanılır?
            </button>
            <Link href="/nobetci-eczane-rehberi">Nöbetçi eczane rehberi</Link>
            <a href={sourceUrl} target="_blank" rel="noreferrer">
              <span>Resmî nöbet listesi</span>
              <ArrowUpRight size={14} />
            </a>
            <Link href="/iletisim">Hata ve adres bildir</Link>
          </nav>
        </div>

        {/* Yasal Bilgiler */}
        <div className="footer-group" data-open={open === 'legal'}>
          <h3>Yasal Bilgiler</h3>
          <button
            type="button"
            className="footer-toggle"
            aria-expanded={open === 'legal'}
            aria-controls="footer-legal-links"
            onClick={() => toggleGroup('legal')}
          >
            <span>Yasal Bilgiler</span>
            <ChevronDown size={18} />
          </button>
          <nav id="footer-legal-links" className="footer-links" aria-label="Yasal bilgiler">
            {legalLinks.map(link => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
            <button
              type="button"
              className="cookie-settings-btn"
              onClick={() => window.dispatchEvent(new Event('simdiacik:open-cookie-settings'))}
            >
              Çerez tercihleri
            </button>
          </nav>
        </div>
      </div>

      {/* Alt Çubuk */}
      <div className="footer-bottom">
        <div className="footer-bottom-copy">
          <span>© {new Date().getFullYear()} Şimdi Açık · Türkiye Nöbetçi Eczane Bulucu</span>
          <small>Veriler ilgili Eczacı Odaları ve kamu açık veri servislerince sağlanır.</small>
        </div>
        <a href="#eczaneler" onClick={scrollToTop} className="footer-back-top" aria-label="Sayfanın başına dön">
          <span>Yukarı çık</span>
          <ArrowUp size={15} />
        </a>
      </div>
    </footer>
  );
}
