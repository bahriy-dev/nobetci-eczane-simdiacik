"use client";
import {
  X,
  MapPin,
  Phone,
  Navigation,
  Share2,
  Copy,
  CalendarDays,
  Flag,
  Clock,
} from "lucide-react";
import { SheetTitle, SheetDescription } from "./ui/sheet";
import { PharmacyStatus } from "./pharmacy-status";
import {
  pharmacyDistance,
  pharmacyDirections,
  pharmacyAppleDirections,
  pharmacyPhoneLink,
  pharmacyDutyDate,
  pharmacyTimestamp,
  pharmacyDisplayName,
  pharmacyLocationNote,
  pharmacyPhoneDisplay,
  pharmacyDisplayAddress,
} from "@/lib/pharmacy-presentation";
import { safeUrl } from "@/lib/places";
import type { Place } from "@/lib/places";
type Props = {
  place: Place;
  now: number;
  hideDistance?: boolean;
  onClose: () => void;
  onCopy: () => void;
  onCopyPhone: () => void;
  onShare: () => void;
  reportUrl: string;
};
export function PharmacyDetail({
  place: p,
  now,
  hideDistance = false,
  onClose,
  onCopy,
  onCopyPhone,
  onShare,
  reportUrl,
}: Props) {
  const date = pharmacyDutyDate(p.dutyDate);
  return (
    <div className="pharmacy-detail-content">
      <div className="panel-handle" aria-hidden="true" />
      <button className="panel-close" onClick={onClose} aria-label="Kapat">
        <X size={20} />
      </button>
      <div className="detail-heading">
        <span className="detail-avatar">E</span>
        <div>
          <PharmacyStatus p={p} now={now} />
          {!hideDistance && (
            <span className="detail-distance">
              {pharmacyDistance(p)} uzaklıkta
            </span>
          )}
        </div>
      </div>
      <SheetTitle className="detail-title">{pharmacyDisplayName(p.name)}</SheetTitle>
      <SheetDescription className="sr-only">
        Eczane adresi, telefonu ve yol tarifi
      </SheetDescription>
      <div className="detail-address-box">
        <MapPin size={20} />
        <div>
          <span className="detail-row-label">Adres</span>
          <p>{pharmacyDisplayAddress(p.address)}</p>
          <button className="detail-copy" onClick={onCopy}>
            <Copy size={13} />
            Adresi kopyala
          </button>
        </div>
      </div>
      {p.phone ? (
        <a className="detail-phone-box" href={pharmacyPhoneLink(p.phone)}>
          <span className="detail-row-icon">
            <Phone size={19} />
          </span>
          <span>
            <small>Telefon</small>
            <b>{pharmacyPhoneDisplay(p.phone)}</b>
          </span>
          <Phone size={16} />
        </a>
      ) : (
        <p className="detail-no-phone">
          Bu eczanenin telefon bilgisi paylaşılmamış. Yol tarifi ve adres
          bilgilerini kullanabilirsin.
        </p>
      )}
      {date && (
        <div className="detail-date">
          <CalendarDays size={15} />
          <span>Nöbet günü: {date}</span>
        </div>
      )}
      {p.opens && Number.isFinite(Date.parse(p.opens)) && (
        <div className="detail-date">
          <Clock size={15} />
          <span>Nöbet başlangıcı: {pharmacyTimestamp(p.opens)}</span>
        </div>
      )}
      {p.closes && Number.isFinite(Date.parse(p.closes)) && (
        <div className="detail-date">
          <Clock size={15} />
          <span>Nöbet bitişi: {pharmacyTimestamp(p.closes)}</span>
        </div>
      )}
      {pharmacyLocationNote(p) && (
        <div className="detail-date">
          <MapPin size={15} />
          <span>{pharmacyLocationNote(p)}</span>
        </div>
      )}
      <div className="detail-utility-actions">
        <button onClick={onShare}>
          <Share2 size={17} />
          Paylaş
        </button>
        {p.phone && (
          <button onClick={onCopyPhone} aria-label="Numarayı kopyala">
            <Copy size={15} />
            Kopyala
          </button>
        )}
        <a href={pharmacyAppleDirections(p)} target="_blank" rel="noreferrer">
          <MapPin size={15} />
          Apple Harita
        </a>
      </div>
      <details className="detail-source">
        <summary>Nöbet bilgisi</summary>
        {p.hours && <p>{p.hours}</p>}
        <p>Kaynak kontrolü: {pharmacyTimestamp(p.fetchedAt)}</p>
        {safeUrl(p.sourceUrl) && (
          <a href={safeUrl(p.sourceUrl)} target="_blank" rel="noreferrer">
            {p.source}
          </a>
        )}
        <p>
          Mesafe doğrudan ölçülür; yol uzunluğu farklı olabilir. Yol tarifi
          uygulamasında ulaşım biçimini seçebilirsin.
        </p>
      </details>
      <p className="detail-confirm">Gitmeden önce telefonla teyit et.</p>
      <div className="detail-bottom-actions">
        <a
          className="primary"
          href={pharmacyDirections(p)}
          target="_blank"
          rel="noreferrer"
        >
          <Navigation size={18} />
          Yol tarifi
        </a>
        {p.phone && (
          <a className="detail-call" href={pharmacyPhoneLink(p.phone)}>
            <Phone size={18} />
            Eczaneyi ara
          </a>
        )}
      </div>
      <a className="detail-report" href={reportUrl}>
        <Flag size={13} />
        Bilgi hatasını bildir
      </a>
    </div>
  );
}
