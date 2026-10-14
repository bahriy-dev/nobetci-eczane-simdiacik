"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Compass } from "lucide-react";
import { getPositionWithTimeoutRetry } from "@/lib/geolocation";
import { handoffRegion } from "@/lib/region-handoff";
import { RegionPicker } from "@/components/region-picker";

export function CityGuideSearch({ city }: { city: string }) {
  const router = useRouter();
  const [geoLocating, setGeoLocating] = useState(false);

  const active = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const requestGps = async () => {
    if (geoLocating) return;
    if (!navigator.geolocation) {
      router.push("/?selectLocation=1");
      return;
    }
    setGeoLocating(true);
    try {
      const pos = await getPositionWithTimeoutRetry(navigator.geolocation);
      if (!active.current) return;
      const params = new URLSearchParams({
        lat: String(Number(pos.coords.latitude.toFixed(6))),
        lng: String(Number(pos.coords.longitude.toFixed(6))),
      });
      router.push("/?" + params.toString());
    } catch {
      if (active.current) router.push("/?selectLocation=1");
    } finally {
      if (active.current) setGeoLocating(false);
    }
  };

  return (
    <section
      className="city-guide-search-card"
      aria-labelledby="city-guide-search-title"
    >
      <div className="city-guide-search-header">
        <div className="city-search-badge">
          <MapPin size={14} />
          <span>İlçe & Konum Seçimi</span>
        </div>
        <h2 id="city-guide-search-title">{city} Nöbetçi Eczaneleri Bul</h2>
        <p>
          Cihazınızın konumunu kullanarak en yakındaki nöbetçi eczaneleri
          listeleyin veya ilçe seçerek aramayı başlatın.
        </p>
      </div>

      <div className="city-search-actions">
        <button
          type="button"
          className="city-gps-btn"
          disabled={geoLocating}
          onClick={requestGps}
          aria-label="Cihaz konumunu kullanarak en yakın eczaneleri bul"
        >
          <Compass size={18} className={geoLocating ? "spin" : ""} />
          <span>
            {geoLocating
              ? "Konumunuz alınıyor…"
              : "Bulunduğum Konumu Kullan (GPS)"}
          </span>
        </button>

        <div className="city-search-divider">
          <span>veya ilçeye göre listele</span>
        </div>

        <div className="city-region-picker-wrapper">
          <RegionPicker
            city={city}
            onSelect={(location) => {
              if (handoffRegion(location)) router.push("/?selectedRegion=1");
              else
                router.push(
                  "/?" +
                    new URLSearchParams({
                      lat: String(location.lat),
                      lng: String(location.lng),
                    }).toString(),
                );
            }}
          />
        </div>
      </div>
    </section>
  );
}
