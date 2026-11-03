"use client";

import { useState } from "react";
import { ArrowRight, ArrowUpRight, MapPin } from "lucide-react";
import { PHARMACY_CHAMBERS, getPharmacySource } from "@/lib/pharmacy-sources";
import { cityGuides } from "@/lib/city-guides";
import type { ProvinceDTO } from "@/lib/regions";

type Location = { label: string; city: string; lat: number; lng: number };

const provinces = [...PHARMACY_CHAMBERS].sort((a, b) =>
  a.province.localeCompare(b.province, "tr"),
);

/** With `onSelect` (the search page) a province is searched in place; elsewhere it links out. */
export function ProvinceDirectory({
  locationGranted = false,
  onSelect,
}: {
  locationGranted?: boolean;
  onSelect?: (location: Location) => void;
}) {
  const [provinceId, setProvinceId] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const selected = provinces.find(
    (province) => String(province.provinceId) === provinceId,
  );
  const guide =
    selected && cityGuides.find((city) => city.id === selected.provinceId);
  const source = selected ? getPharmacySource(selected.province) : null;
  const href = guide ? `/nobetci-eczane/${guide.slug}` : source?.url;
  const showHere = async () => {
    if (!selected || !onSelect) return;
    setBusy(true);
    setFailed(false);
    try {
      // The province centre comes from the same region list the location picker uses.
      const response = await fetch("/api/regions");
      const result = (await response.json()) as { regions?: ProvinceDTO[] };
      const province = result.regions?.find(
        (row) => row.id === selected.provinceId,
      );
      if (!response.ok || !province) throw new Error();
      onSelect({
        label: province.name + " · İl merkezi",
        city: province.name,
        lat: province.lat,
        lng: province.lng,
      });
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className="province-directory"
      aria-labelledby="province-directory-title"
    >
      <div className="province-directory-copy">
        {!locationGranted && (
          <span className="province-directory-kicker">
            <MapPin size={14} /> Konum izni gerekmez
          </span>
        )}
        <h2 id="province-directory-title">İline göre nöbetçi eczane bul</h2>
        <p>
          İlini seç, güncel nöbet listesine ulaş.
          {!locationGranted && " Konum paylaşman gerekmez."}
        </p>
      </div>
      <div className="province-directory-picker">
        <label htmlFor="province-directory-select">İl seç</label>
        <select
          id="province-directory-select"
          value={provinceId}
          onChange={(event) => setProvinceId(event.target.value)}
        >
          <option value="">81 il arasından seç</option>
          {provinces.map((province) => (
            <option key={province.provinceId} value={province.provinceId}>
              {province.province}
            </option>
          ))}
        </select>
        {onSelect && selected && (
          <button
            type="button"
            className="province-directory-link"
            disabled={busy}
            onClick={() => void showHere()}
          >
            {busy ? "Açılıyor…" : `${selected.province} nöbetçi eczaneleri`}{" "}
            <ArrowRight size={16} />
          </button>
        )}
        {onSelect && failed && (
          <p className="province-directory-source" role="status">
            İl bilgisi alınamadı. Tekrar dene.
          </p>
        )}
        {!onSelect && selected && (
          <p className="province-directory-source">
            {guide
              ? "İlçe seçerek sitede ara."
              : "Bu il için resmî eczacı odasının nöbet listesi açılır."}
          </p>
        )}
        {!onSelect && href && (
          <a
            className="province-directory-link"
            href={href}
            target={guide ? undefined : "_blank"}
            rel={guide ? undefined : "noreferrer"}
          >
            {guide ? "İlçeni seç" : "Resmî nöbet listesini aç"}{" "}
            {guide ? <ArrowRight size={16} /> : <ArrowUpRight size={16} />}
          </a>
        )}
      </div>
    </section>
  );
}
