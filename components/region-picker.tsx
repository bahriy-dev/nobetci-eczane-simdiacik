"use client";

import { useEffect, useRef, useState } from "react";
import { requestDeadline } from "@/lib/retry-fetch";
import { normalized } from "@/lib/places";
import type { ProvinceDTO, DistrictDTO, RegionsResult } from "@/lib/regions";

type Location = { label: string; city: string; lat: number; lng: number };

export function RegionPicker({
  city,
  district,
  onSelect,
}: {
  city: string;
  district?: string;
  onSelect: (location: Location) => void;
}) {
  const [provinces, setProvinces] = useState<ProvinceDTO[]>([]);
  const [districtResource, setDistrictResource] = useState<{
    key: string;
    rows: DistrictDTO[];
  }>({ key: "", rows: [] });
  const [provinceId, setProvinceId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [districtQuery, setDistrictQuery] = useState("");
  const [retry, setRetry] = useState(0);
  const [loadedProvinceKey, setLoadedProvinceKey] = useState("");
  const provinceKey = city + "|" + retry;
  const districtKey = provinceId + "|" + retry;
  const loading = loadedProvinceKey !== provinceKey;
  const districtLoading =
    Boolean(provinceId) && districtResource.key !== districtKey;
  const districts =
    districtResource.key === districtKey ? districtResource.rows : [];
  const visibleDistricts = districts.filter(
    (row) =>
      String(row.id) === districtId ||
      normalized(row.name).includes(normalized(districtQuery.trim())),
  );
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState("");
  const [errorStage, setErrorStage] = useState<
    "provinces" | "districts" | "location"
  >("provinces");
  const syncedCity = useRef("");
  const syncedDistrict = useRef("");
  const selectionRequest = useRef<AbortController | null>(null);

  useEffect(() => () => selectionRequest.current?.abort(), []);

  useEffect(() => {
    const controller = new AbortController();
    const deadline = requestDeadline(controller.signal, 12000);
    fetch("/api/regions", {
      signal: deadline.signal,
    })
      .then(async (response) => {
        const result = (await response.json()) as RegionsResult & {
          error?: string;
        };
        if (!response.ok || result.kind !== "provinces")
          throw new Error(result.error || "İl listesi alınamadı.");
        const rows = result.regions as ProvinceDTO[];
        if (controller.signal.aborted) return;
        setProvinces(rows);
        if (syncedCity.current !== city) {
          setProvinceId(
            String(
              rows.find((p) => normalized(p.name) === normalized(city))?.id ||
                "",
            ),
          );
          syncedCity.current = city;
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError("İl listesi yüklenemedi. Tekrar deneyebilirsin.");
          setErrorStage("provinces");
        }
      })
      .finally(() => {
        deadline.dispose();
        if (!controller.signal.aborted) setLoadedProvinceKey(provinceKey);
      });
    return () => {
      controller.abort();
      deadline.dispose();
    };
  }, [city, retry, provinceKey]);

  useEffect(() => {
    if (!provinceId) return;
    const controller = new AbortController();
    const deadline = requestDeadline(controller.signal, 12000);
    fetch("/api/regions?provinceId=" + provinceId, {
      signal: deadline.signal,
    })
      .then(async (response) => {
        const result = (await response.json()) as RegionsResult & {
          error?: string;
        };
        if (!response.ok || result.kind !== "districts")
          throw new Error(result.error || "İlçe listesi alınamadı.");
        if (controller.signal.aborted) return;
        const rows = result.regions as DistrictDTO[];
        setDistrictResource({ key: districtKey, rows });
        setError("");
        const districtKeyForSync = city + "|" + (district || "");
        if (syncedDistrict.current !== districtKeyForSync) {
          setDistrictId(
            String(
              rows.find(
                (d) => normalized(d.name) === normalized(district || ""),
              )?.id || "",
            ),
          );
          syncedDistrict.current = districtKeyForSync;
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError("İlçe listesi yüklenemedi. Tekrar deneyebilirsin.");
          setErrorStage("districts");
        }
      })
      .finally(() => {
        deadline.dispose();
        if (!controller.signal.aborted)
          setDistrictResource((prev) =>
            prev.key === districtKey ? prev : { key: districtKey, rows: [] },
          );
      });
    return () => {
      controller.abort();
      deadline.dispose();
    };
  }, [provinceId, retry, districtKey, city, district]);

  const select = async () => {
    const province = provinces.find((p) => String(p.id) === provinceId);
    if (!province) return;
    const district = districts.find((d) => String(d.id) === districtId);
    selectionRequest.current?.abort();
    const controller = new AbortController();
    selectionRequest.current = controller;
    const deadline = requestDeadline(controller.signal, 15000);
    setSelecting(true);
    setError("");
    try {
      if (!district || normalized(district.name) === "merkez") {
        onSelect({
          label: district
            ? district.name + ", " + province.name
            : province.name + " · İl merkezi",
          city: province.name,
          lat: province.lat,
          lng: province.lng,
        });
        return;
      }
      // Districts have no coordinates in TürkiyeAPI; resolve only on a user click.
      const q = district.name + ", " + province.name;
      const response = await fetch("/api/location?q=" + encodeURIComponent(q), {
        signal: deadline.signal,
      });
      const result = (await response.json()) as Location[] & { error?: string };
      if (!response.ok)
        throw new Error(result.error || "İlçe konumu alınamadı.");
      const match = result.find(
        (p) =>
          normalized(p.city) === normalized(province.name) &&
          normalized(p.label.split(",")[0].trim()) ===
            normalized(district.name),
      );
      if (!match)
        throw new Error(
          "İlçe merkezi bulunamadı. Mahalle veya adres aramasını kullanabilirsin.",
        );
      if (controller.signal.aborted) return;
      onSelect({
        ...match,
        label: district.name + ", " + province.name,
        city: province.name,
      });
    } catch (e) {
      if (!controller.signal.aborted) {
        setError(
          (e as Error).name === "TimeoutError"
            ? "Konum araması zamanında tamamlanamadı. Tekrar deneyebilirsin."
            : (e as Error).message,
        );
        setErrorStage("location");
      }
    } finally {
      deadline.dispose();
      if (!controller.signal.aborted) setSelecting(false);
    }
  };

  return (
    <div className="region-picker">
      {provinceId && (
        <label className="region-search-label">
          İlçe ara
          <input
            type="search"
            aria-label="İlçe adını yaz"
            placeholder="Örn. Çankaya"
            value={districtQuery}
            disabled={districtLoading || selecting}
            onChange={(event) => setDistrictQuery(event.target.value)}
            maxLength={80}
          />
        </label>
      )}
      <div className="region-selects">
        <label>
          İl
          <select
            aria-label="İl seç"
            value={provinceId}
            disabled={loading || selecting}
            onChange={(e) => {
              selectionRequest.current?.abort();
              setProvinceId(e.target.value);
              setDistrictId("");
              setDistrictQuery("");
              setError("");
            }}
          >
            <option value="">{loading ? "İller yükleniyor…" : "İl seç"}</option>
            {provinces.map((p) => (
              <option value={p.id} key={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          İlçe
          <select
            aria-label="İlçe seç"
            value={districtId}
            disabled={!provinceId || districtLoading || selecting}
            onChange={(e) => setDistrictId(e.target.value)}
          >
            <option value="">
              {districtLoading ? "İlçeler yükleniyor…" : "İl merkezi"}
            </option>
            {visibleDistricts.map((d) => (
              <option value={d.id} key={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {districtQuery && visibleDistricts.length === 0 && (
        <p className="region-search-empty" role="status">
          Bu ilde eşleşen ilçe yok. İlçe adını yeniden yaz.
        </p>
      )}
      <button
        className="primary"
        disabled={!provinceId || loading || selecting || districtLoading}
        onClick={() => void select()}
      >
        {selecting ? "Konum bulunuyor…" : "Bu bölgeyi kullan"}
      </button>
      {error && (
        <div className="region-error" role="alert">
          <p>{error}</p>
          <button
            onClick={() =>
              errorStage === "location" ? void select() : setRetry((r) => r + 1)
            }
          >
            Tekrar dene
          </button>
        </div>
      )}
    </div>
  );
}
