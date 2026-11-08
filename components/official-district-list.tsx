"use client";

import { useState } from "react";
import { ExternalLink, Landmark } from "lucide-react";
import { districtInLabel, type OfficialList } from "@/lib/official-lists";

/**
 * The official list for a province this server cannot read: a district picker that opens the
 * chamber's own page (İstanbul, Yalova) or shows its embeddable list inside the site (Ordu).
 */
export function OfficialDistrictList({
  list,
  label,
}: {
  list: OfficialList;
  label: string;
}) {
  const [district, setDistrict] = useState(
    () => (districtInLabel(list, label) ?? list.pages[0]).district,
  );
  const page =
    list.pages.find((item) => item.district === district) ?? list.pages[0];

  return (
    <section className="official-list" aria-labelledby="official-list-title">
      <div className="official-list-head">
        <span className="official-list-icon" aria-hidden="true">
          <Landmark size={20} />
        </span>
        <div>
          <h3 id="official-list-title">{list.source} resmî nöbet listesi</h3>
          <p>
            {list.mode === "embed"
              ? "Liste odanın sayfasından, doğrudan senin tarayıcında açılıyor."
              : "Oda listeyi yalnızca kendi sitesinde yayımlıyor. İlçeni seç, o ilçenin resmî listesi açılsın."}
          </p>
        </div>
      </div>
      <label className="official-list-picker">
        <span>İlçe</span>
        <select
          value={page.district}
          onChange={(event) => setDistrict(event.target.value)}
        >
          {list.pages.map((item) => (
            <option key={item.url} value={item.district}>
              {item.district}
            </option>
          ))}
        </select>
      </label>
      {list.mode === "embed" ? (
        <>
          <iframe
            key={page.url}
            className="official-list-frame"
            src={page.url}
            title={`${page.district} nöbetçi eczaneleri · ${list.source}`}
            loading="lazy"
            referrerPolicy="no-referrer"
            sandbox="allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
          />
          <a
            className="official-list-open"
            href={page.url}
            target="_blank"
            rel="noreferrer"
          >
            Listeyi ayrı sekmede aç <ExternalLink size={14} />
          </a>
        </>
      ) : (
        <a
          className="official-list-button"
          href={page.url}
          target="_blank"
          rel="noreferrer"
        >
          {page.district} nöbetçi eczanelerini aç <ExternalLink size={16} />
        </a>
      )}
      <p className="official-list-note">
        Gitmeden önce eczaneyi telefonla arayarak teyit et.
      </p>
    </section>
  );
}
