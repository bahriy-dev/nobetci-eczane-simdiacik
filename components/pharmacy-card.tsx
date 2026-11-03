"use client";
import { MapPin, Navigation, Phone, Copy } from "lucide-react";
import type { Place } from "@/lib/places";
import {
  pharmacyDistance,
  pharmacyDirections,
  pharmacyPhoneLink,
  pharmacyShortAddress,
  pharmacyDisplayName,
} from "@/lib/pharmacy-presentation";
import { PharmacyStatus } from "./pharmacy-status";
type Props = {
  p: Place;
  number: number;
  now: number;
  highlighted: boolean;
  closest: boolean;
  hideDistance?: boolean;
  onOpen: () => void;
  onHover: (id: string | null) => void;
  onCopy: () => void;
};
export function PharmacyCard({
  p,
  number,
  now,
  highlighted,
  closest,
  hideDistance = false,
  onOpen,
  onHover,
  onCopy,
}: Props) {
  return (
    <article
      id={"pharmacy-" + p.id}
      className={"pharmacy-card " + (highlighted ? "highlight" : "")}
      onMouseEnter={() => onHover(p.id)}
      onMouseLeave={() => onHover(null)}
    >
      <button
        className="card-open"
        aria-label={p.name + " eczane bilgilerini aç"}
        onClick={onOpen}
      />
      <div className="pharmacy-card-top">
        <span
          className="pharmacy-symbol"
          aria-label={number + " numaralı harita pini"}
        >
          {number}
        </span>
        <div>
          <h3 className="pharmacy-name">
            {pharmacyDisplayName(p.name)}
          </h3>
          <div className="card-status-row">
            <PharmacyStatus p={p} now={now} />
            {!hideDistance && (
              <span
                title="Doğrudan ölçülen yaklaşık mesafe; yol uzunluğu farklı olabilir."
                aria-label={pharmacyDistance(p) + " yaklaşık doğrusal mesafe"}
              >
                {pharmacyDistance(p)}
              </span>
            )}
            {closest && <span className="closest">En yakın</span>}
          </div>
        </div>
      </div>
      <p className="pharmacy-address">
        <MapPin size={14} />
        <span title={p.address}>
          {pharmacyShortAddress(p.address)}
          {(p.locationEstimate === "neighbourhood" || p.locationEstimate === "district") && (
            <em className="location-estimate"> · yaklaşık konum</em>
          )}
        </span>
        <button
          className="card-copy-address"
          onClick={onCopy}
          aria-label={p.name + " adresini kopyala"}
          title="Adresi kopyala"
        >
          <Copy size={14} />
        </button>
      </p>
      <div className="pharmacy-actions">
        <a
          className="directions-button"
          href={pharmacyDirections(p)}
          target="_blank"
          rel="noreferrer"
        >
          <Navigation size={16} />
          Yol tarifi
        </a>
        {p.phone ? (
          <a className="primary" href={pharmacyPhoneLink(p.phone)}>
            <Phone size={16} />
            Eczaneyi ara
          </a>
        ) : (
          <span className="no-phone">Telefon paylaşılmamış</span>
        )}
      </div>
    </article>
  );
}
