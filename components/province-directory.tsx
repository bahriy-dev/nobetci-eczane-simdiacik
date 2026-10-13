"use client";

import { useState } from "react";
import { ArrowRight, ArrowUpRight, MapPin } from "lucide-react";
import { PHARMACY_CHAMBERS, getPharmacySource } from "@/lib/pharmacy-sources";
import { cityGuides } from "@/lib/city-guides";

const provinces = [...PHARMACY_CHAMBERS].sort((a, b) =>
  a.province.localeCompare(b.province, "tr"),
);

export function ProvinceDirectory() {
  const [provinceId, setProvinceId] = useState("");
  const selected = provinces.find(
    (province) => String(province.provinceId) === provinceId,
  );
  const guide =
    selected && cityGuides.find((city) => city.id === selected.provinceId);
  const source = selected ? getPharmacySource(selected.province) : null;
  const href = guide ? `/nobetci-eczane/${guide.slug}` : source?.url;

  return (
    <section
      className="province-directory"
      aria-labelledby="province-directory-title"
    >
      <div className="province-directory-copy">
        <span className="province-directory-kicker">
          <MapPin size={14} /> Konum izni gerekmez
        </span>
        <h2 id="province-directory-title">İline göre nöbetçi eczane bul</h2>
        <p>İlini seç, güncel nöbet listesine ulaş. Konum paylaşman gerekmez.</p>
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
        {selected && (
          <p className="province-directory-source">
            {guide
              ? "İlçe seçerek sitede ara."
              : "Bu il için resmî eczacı odasının nöbet listesi açılır."}
          </p>
        )}
        {href && (
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
