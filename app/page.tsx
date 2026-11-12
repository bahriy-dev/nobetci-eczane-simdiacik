"use client";
import Link from "next/link";
import { istanbulOverview } from "@/lib/default-search";
import {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
  useSyncExternalStore,
  lazy,
  Suspense,
} from "react";
import {
  Search,
  MapPin,
  Pill,
  Plus,
  Moon,
  Sun,
  SlidersHorizontal,
  Map,
  LayoutList,
  RefreshCw,
  LocateFixed,
  X,
  Info,
  ChevronDown,
  ExternalLink,
  ArrowUpRight,
  Share2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster, toast } from "sonner";
import { RegionPicker } from "@/components/region-picker";
import {
  filterPlaces,
  parsePlacesResult,
  type Place,
  type PlacesResult,
} from "@/lib/places";
import { PharmacyCard } from "@/components/pharmacy-card";
import { PharmacyDetail } from "@/components/pharmacy-detail";
import { SiteFooter } from "@/components/site-footer";
import { OfficialDistrictList } from "@/components/official-district-list";
import { officialListFor } from "@/lib/official-lists";
import { MapBoundary } from "@/components/map-boundary";
import {
  pharmacyDistance as distance,
  pharmacyMapLink,
} from "@/lib/pharmacy-presentation";
import { getPharmacySource } from "@/lib/pharmacy-sources";
import { fetchJsonWithRetry } from "@/lib/retry-fetch";
import { SelectionGuard } from "@/lib/selection-guard";
import { getPositionWithTimeoutRetry } from "@/lib/geolocation";
import {
  clearLocationCache,
  readLocationCache,
  writeLocationCache,
} from "@/lib/location-cache";
import { consumeRegionHandoff, readRegionHandoff } from "@/lib/region-handoff";
import { parseSharedCoordinates } from "@/lib/shared-location";
import { noResultsRecovery } from "@/lib/no-results-guidance";
import {
  readSavedRegion,
  saveRegion,
  clearSavedRegion,
} from "@/lib/saved-region";
import { useSearchFilters } from "@/lib/use-search-filters";
import {
  subscribeTheme,
  readTheme,
  serverTheme,
  writeTheme,
  subscribeNetwork,
  readNetwork,
  serverNetwork,
} from "@/lib/browser-preferences";
const PlaceMap = lazy(() => import("@/components/place-map"));
const subscribeWideScreen = (notify: () => void) => {
  const media = window.matchMedia("(min-width:801px)");
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
const readWideScreen = () => window.matchMedia("(min-width:801px)").matches;
const serverWideScreen = () => false;
type Location = {
  label: string;
  city: string;
  lat: number;
  lng: number;
  accuracy?: number;
};

const noLocation: Location = { label: "", city: "", lat: 0, lng: 0 };

export default function Home() {
  const { filters, updateFilters } = useSearchFilters();
  const { query, hasPhone, radius, sort } = filters;
  const [debounced, setDebounced] = useState("");
  const setQuery = useCallback(
    (value: string) => updateFilters({ query: value }, true),
    [updateFilters],
  );
  const setHasPhone = (value: boolean) => updateFilters({ hasPhone: value });
  const setRadius = (value: string) => updateFilters({ radius: value });
  const setSort = (value: string) => updateFilters({ sort: value });
  const [provinceOverview, setProvinceOverview] = useState(false);
  const [, setLocationPermissionGranted] =
    useState(false);
  const locationOpener = useRef<HTMLElement | null>(null);
  const [rememberRegion, setRememberRegion] = useState(false);
  // Nothing is searched until the visitor shares a location or picks a province.
  const [location, setLocationValue] = useState<Location>(noLocation),
    [scrollTarget, setScrollTarget] = useState<string | null>(null),
    [geoState, setGeoState] = useState(""),
    [refresh, setRefresh] = useState(0);
  const [selectedValue, setSelected] = useState<Place | null>(null),
    [hover, setHover] = useState<string | null>(null);
  const [locationTab, setLocationTab] = useState<"region" | "address">(
      "region",
    ),
    [locOpen, setLocOpen] = useState(false),
    [locQuery, setLocQuery] = useState(""),
    [locResults, setLocResults] = useState<Location[]>([]),
    [locLoading, setLocLoading] = useState(false),
    [locError, setLocError] = useState(""),
    [locationPending, setLocationPending] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false),
    [mapMobile, setMapMobile] = useState(false),
    [now, setNow] = useState(() => Date.now()),
    [limit, setLimit] = useState(8),
    [focused, setFocused] = useState<string | null>(null),
    [helpOpen, setHelpOpen] = useState(false);
  const locationChosen = Boolean(location.city);
  const dark = useSyncExternalStore(subscribeTheme, readTheme, serverTheme),
    online = useSyncExternalStore(subscribeNetwork, readNetwork, serverNetwork);
  const wasOnline = useRef(online);
  const wideScreen = useSyncExternalStore(
    subscribeWideScreen,
    readWideScreen,
    serverWideScreen,
  );
  const requestKey = JSON.stringify([
    location.lat,
    location.lng,
    location.city,
    provinceOverview,
    radius,
    refresh,
  ]);
  const searchContext = JSON.stringify([
    location.lat,
    location.lng,
    location.city,
    provinceOverview,
    radius,
  ]);
  const [resource, setResource] = useState<{
    key: string;
    context: string;
    data: PlacesResult | null;
    error: string;
  }>({ key: "", context: "", data: null, error: "" });
  const loading = locationChosen && resource.key !== requestKey;
  const data = resource.context === searchContext ? resource.data : null,
    error = resource.key === requestKey ? resource.error : "";
  const selected =
    selectedValue &&
    (!selectedValue.verifiedUntil ||
      Date.parse(selectedValue.verifiedUntil) > now)
      ? selectedValue
      : null;
  const changeRadius = (next: string) => {
    setProvinceOverview(false);
    setRadius(next);
    setLimit(8);
    setSelected(null);
    setHover(null);
    setFocused(null);
    setScrollTarget(null);
  };
  const selectionGuard = useRef(new SelectionGuard());
  const locationRequest = useRef<AbortController | null>(null);
  const setLocation = useCallback((next: Location) => {
    setProvinceOverview(false);
    selectionGuard.current.invalidate();
    locationRequest.current?.abort();
    setLocationPending(false);
    setLocationValue(next);
    setLimit(8);
    setSelected(null);
    setHover(null);
    setFocused(null);
    setScrollTarget(null);
  }, []);
  const switchLocationTab = (tab: "region" | "address") => {
    setLocationTab(tab);
    requestAnimationFrame(() => document.getElementById(tab + "-tab")?.focus());
  };
  const locationTabKeys = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      switchLocationTab(
        event.key === "Home"
          ? "region"
          : event.key === "End"
            ? "address"
            : locationTab === "region"
              ? "address"
              : "region",
      );
    }
  };
  const initialLocationRequest = useRef(false);
  useEffect(
    () => () => {
      selectionGuard.current.invalidate();
      locationRequest.current?.abort();
    },
    [],
  );
  const requestDeviceLocation = useCallback(() => {
    if (locationPending) return;
    initialLocationRequest.current = true;
    const attempt = selectionGuard.current.begin();
    if (!navigator.geolocation) {
      setGeoState(
        "Bu tarayıcı konumu desteklemiyor. İl veya ilçe seçerek devam edebilirsin.",
      );
      return;
    }
    locationRequest.current?.abort();
    const controller = new AbortController();
    locationRequest.current = controller;
    setLocationPending(true);
    setGeoState("Yakın çevren taranıyor…");
    void getPositionWithTimeoutRetry(navigator.geolocation, () => {
      if (selectionGuard.current.isCurrent(attempt))
        setGeoState("Konum aranıyor… Biraz daha bekleyelim.");
    })
      .then(async (p) => {
        if (!selectionGuard.current.isCurrent(attempt)) return;
        setLocationPermissionGranted(true);
        const lat = p.coords.latitude,
          lng = p.coords.longitude;
        if (
          !Number.isFinite(lat) ||
          !Number.isFinite(lng) ||
          lat < 35 ||
          lat > 43 ||
          lng < 25 ||
          lng > 45
        ) {
          setGeoState(
            "Türkiye içindeki konumlar destekleniyor. İl veya ilçe seçerek devam edebilirsin.",
          );
          setLocationPending(false);
          return;
        }
        try {
          const d = await fetchJsonWithRetry<Location>(
            `/api/location?lat=${lat}&lng=${lng}`,
            controller.signal,
            { timeoutMs: 12000 },
          );
          if (!d.city) throw new Error();
          if (!selectionGuard.current.isCurrent(attempt)) return;
          const resolved = { ...d, lat, lng, accuracy: p.coords.accuracy };
          writeLocationCache(resolved);
          setLocation(resolved);
          setGeoState("");
          setLocOpen(false);
        } catch {
          if (!selectionGuard.current.isCurrent(attempt)) return;
          setGeoState(
            "Konumun bölgesi bulunamadı. İl veya ilçe seçerek devam edebilirsin.",
          );
          setLocationPending(false);
        }
      })
      .catch((failure: GeolocationPositionError) => {
        if (!selectionGuard.current.isCurrent(attempt)) return;
        if (failure.code === 1) clearLocationCache();
        setGeoState(
          failure.code === 1
            ? "Konum izni verilmedi. İl veya ilçe seçerek devam edebilirsin."
            : failure.code === 3
              ? "Konum alınamadı. Tekrar deneyebilir veya il/ilçe seçebilirsin."
              : "Konum alınamadı. İl veya ilçe seçebilirsin.",
        );
        setLocationPending(false);
      });
  }, [locationPending, setLocation]);
  useEffect(() => {
    const parameters = new URLSearchParams(window.location.search);
    const handoff =
      parameters.get("selectedRegion") === "1" ? readRegionHandoff() : null;
    void Promise.resolve().then(() => {
      if (parameters.get("selectLocation") === "1") setLocOpen(true);
      if (parameters.get("view") === "map") setMapMobile(true);
    });
    const coordinates = parseSharedCoordinates(window.location.search);
    const saved = handoff ?? (coordinates ? null : readSavedRegion());
    if (saved) {
      const guard = selectionGuard.current;
      initialLocationRequest.current = true;
      const attempt = guard.begin();
      void Promise.resolve().then(() => {
        if (selectionGuard.current.isCurrent(attempt)) {
          if (handoff) {
            consumeRegionHandoff();
            clearSavedRegion();
          }
          setRememberRegion(!handoff);
          setLocation(saved);
        }
      });
      return () => guard.invalidate();
    }
    if (!coordinates) return;
    initialLocationRequest.current = true;
    const attempt = selectionGuard.current.begin();
    const controller = new AbortController();
    locationRequest.current = controller;
    void fetchJsonWithRetry<Location>(
      `/api/location?lat=${coordinates.lat}&lng=${coordinates.lng}`,
      controller.signal,
      { timeoutMs: 12000 },
    )
      .then((d) => {
        if (d.city && selectionGuard.current.isCurrent(attempt))
          setLocation({ ...d, ...coordinates });
      })
      .catch(() => {
        if (selectionGuard.current.isCurrent(attempt))
          setGeoState(
            "Paylaşılan bölge belirlenemedi. İl ve ilçe seçerek devam edebilirsin.",
          );
      });
    return () => controller.abort();
  }, [setLocation]);
  useEffect(() => {
    let active = true;
    let permissionStatus: PermissionStatus | undefined;
    const cached = readLocationCache();
    void (async () => {
      if (!navigator.permissions) {
        await Promise.resolve();
        if (active && cached && !initialLocationRequest.current)
          setLocation(cached);
        return;
      }
      try {
        const permission = await navigator.permissions.query({
          name: "geolocation",
        });
        if (!active) return;
        permissionStatus = permission;
        const resume = () => {
          setLocationPermissionGranted(permission.state === "granted");
          if (permission.state === "granted") {
            if (!initialLocationRequest.current) {
              if (cached) setLocation(cached);
              requestDeviceLocation();
            }
          } else if (permission.state === "denied") clearLocationCache();
        };
        resume();
        permission.onchange = resume;
      } catch {}
    })();
    return () => {
      active = false;
      if (permissionStatus) permissionStatus.onchange = null;
    };
  }, [requestDeviceLocation, setLocation]);
  useEffect(() => {
    if ("serviceWorker" in navigator)
      void navigator.serviceWorker.register("/sw.js").catch(() => {});
    const tick = setInterval(() => setNow(Date.now()), 15000);
    return () => {
      clearInterval(tick);
    };
  }, []);
  useEffect(() => {
    if (online && !wasOnline.current && locationChosen)
      setRefresh((value) => value + 1);
    wasOnline.current = online;
  }, [online, locationChosen]);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);
  useEffect(() => {
    if (dark === readTheme())
      document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  useEffect(() => {
    if (!location.city) return;
    const controller = new AbortController();
    fetchJsonWithRetry<PlacesResult>(
      "/api/places?" +
        new URLSearchParams({
          lat: String(location.lat),
          lng: String(location.lng),
          radius,
          city: location.city,
          category: "Eczane",
          scope: provinceOverview ? "province" : "nearby",
        }),
      controller.signal,
    )
      .then((raw) => {
        if (controller.signal.aborted) return;
        const d = parsePlacesResult(raw);
        setResource({
          key: requestKey,
          context: searchContext,
          data: d,
          error: "",
        });
        setNow(Date.now());
        setSelected((prev) =>
          prev ? d.places.find((p) => p.id === prev.id) || null : null,
        );
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setSelected(null);
          setResource({
            key: requestKey,
            context: searchContext,
            data: null,
            error: e.message || "Güncel nöbet bilgisi alınamadı.",
          });
        }
      });
    return () => controller.abort();
  }, [
    location.lat,
    location.lng,
    location.city,
    provinceOverview,
    radius,
    requestKey,
    searchContext,
  ]);
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") setRefresh((x) => x + 1);
    }, 120000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const ctx = (
      document as unknown as {
        modelContext?: {
          registerTool: (tool: unknown, options: unknown) => Promise<void>;
        };
      }
    ).modelContext;
    if (!ctx?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(
      ctx.registerTool(
        {
          name: "set_pharmacy_search",
          description: "Mevcut nöbetçi eczane listesinde ad veya adres arar.",
          inputSchema: {
            type: "object",
            properties: { query: { type: "string", maxLength: 150 } },
            required: ["query"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false },
          execute: async (input: unknown) => {
            const q = (input as { query?: unknown })?.query;
            if (typeof q !== "string" || q.length > 150)
              throw new Error("Geçerli bir eczane araması gerekli");
            setQuery(q);
            setDebounced(q);
            return { query: q, category: "Eczane", searchStarted: true };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
    return () => lifecycle.abort();
  }, [setQuery]);
  const results = useMemo(
    () =>
      filterPlaces(data?.places || [], {
        category: "Eczane",
        radius: provinceOverview ? istanbulOverview.radius : Number(radius),
        onlyOpen: true,
        hasPhone,
        favoritesOnly: false,
        favorites: [],
        query: debounced,
        now,
      }).sort((a, b) =>
        provinceOverview || sort === "name"
          ? a.name.localeCompare(b.name, "tr")
          : a.distance - b.distance,
      ),
    [data, radius, provinceOverview, hasPhone, debounced, now, sort],
  );
  const mapCenter = useMemo<[number, number]>(
    () => [location.lat, location.lng],
    [location.lat, location.lng],
  );
  const basePlaces = data?.places || [];
  useEffect(() => {
    const deadline = Math.min(
      ...(data?.places || []).map((place) =>
        Date.parse(place.verifiedUntil || ""),
      ),
    );
    if (!Number.isFinite(deadline) || deadline <= Date.now()) return;
    const timer = setTimeout(
      () => {
        setNow(Date.now());
        if (navigator.onLine) setRefresh((value) => value + 1);
      },
      Math.min(2_147_483_647, deadline - Date.now() + 1),
    );
    return () => clearTimeout(timer);
  }, [data]);
  useEffect(() => {
    const resume = () => {
      if (document.visibilityState === "visible") {
        setNow(Date.now());
        if (locationChosen && online) setRefresh((value) => value + 1);
      }
    };
    document.addEventListener("visibilitychange", resume);
    return () => document.removeEventListener("visibilitychange", resume);
  }, [locationChosen, online]);
  const unsupported = data?.coverageStatus === "unsupported";
  // Provinces this server cannot read still get their official district lists, without any API.
  const officialList = locationChosen ? officialListFor(location.city) : undefined;
  const expired = basePlaces.some(
    (p) => p.verifiedUntil && Date.parse(p.verifiedUntil) <= now,
  );
  const noResultsAction = noResultsRecovery({
    unsupported,
    expired,
    hasFilters: Boolean(query.trim() || hasPhone),
    radiusKm: provinceOverview ? istanbulOverview.radius : Number(radius),
  });
  const sourceDelayed = Boolean(
    data?.fetchedAt &&
    Number.isFinite(Date.parse(data.fetchedAt)) &&
    now - Date.parse(data.fetchedAt) > 10 * 60_000,
  );
  const pharmacySource = getPharmacySource(location.city);
  const sourceLinkLabel = "Nöbet listesini aç";
  const changeTheme = () => writeTheme(!dark);
  const clearFilters = () => {
    updateFilters({
      query: "",
      hasPhone: false,
      radius: "10",
      sort: "distance",
    });
    setDebounced("");
    setSelected(null);
    setHover(null);
    setFocused(null);
    setScrollTarget(null);
  };
  const clearNarrowFilters = () => {
    updateFilters({ query: "", hasPhone: false });
    setDebounced("");
  };
  const closeLocation = () => {
    setLocOpen(false);
    selectionGuard.current.invalidate();
    locationRequest.current?.abort();
    setLocationPending(false);
    setLocLoading(false);
  };
  const selectRegion = (next: Location) => {
    if (rememberRegion) saveRegion(next);
    else clearSavedRegion();
    setLocation(next);
    setLocOpen(false);
    setGeoState("");
  };
  const forgetLocation = () => {
    clearLocationCache();
    clearSavedRegion();
    setRememberRegion(false);
    initialLocationRequest.current = true;
    setLocation(noLocation);
    setLocOpen(false);
    setGeoState("");
    const url = new URL(window.location.href);
    url.searchParams.delete("lat");
    url.searchParams.delete("lng");
    window.history.replaceState(
      window.history.state,
      "",
      url.pathname + url.search + url.hash,
    );
    toast.success("Kayıtlı konum silindi.");
  };
  const searchLocation = async () => {
    locationRequest.current?.abort();
    const controller = new AbortController();
    locationRequest.current = controller;
    setLocLoading(true);
    setLocError("");
    try {
      const d = await fetchJsonWithRetry<Location[]>(
        "/api/location?q=" + encodeURIComponent(locQuery),
        controller.signal,
        { timeoutMs: 12000 },
      );
      if (controller.signal.aborted) return;
      setLocResults(d);
      if (!d.length)
        setLocError("Adres bulunamadı. İlçe ve şehri birlikte yaz.");
    } catch {
      if (!controller.signal.aborted)
        setLocError(
          "Adres araması tamamlanamadı. Tekrar dene veya il ve ilçe seç.",
        );
    } finally {
      if (!controller.signal.aborted) setLocLoading(false);
    }
  };
  const share = async (p: Place) => {
    try {
      const url = pharmacyMapLink(p);
      const name = p.name
        .toLocaleLowerCase("tr-TR")
        .replace(/(^|\s)\S/g, (c) => c.toLocaleUpperCase("tr-TR"));
      const text = name + "\n\n" + p.address + "\n\nHaritada aç:\n" + url;
      if (navigator.share) await navigator.share({ title: name, text });
      else {
        await navigator.clipboard.writeText(text);
        toast.success("Eczane bilgileri ve konumu kopyalandı.");
      }
    } catch {
      toast.info("Paylaşım tamamlanmadı.");
    }
  };
  const controls = (
    <>
      <label className="switch-label">
        <Switch checked={hasPhone} onCheckedChange={setHasPhone} />
        Telefonu olanlar
      </label>
      {!provinceOverview && (
        <Select value={radius} onValueChange={changeRadius}>
          <SelectTrigger aria-label="Arama mesafesi" className="filter-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["2", "5", "10", "20"].map((v) => (
              <SelectItem key={v} value={v}>
                {v} km içinde
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Select value={provinceOverview ? "name" : sort} onValueChange={setSort}>
        <SelectTrigger aria-label="Eczane sıralaması" className="filter-select">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {!provinceOverview && (
            <SelectItem value="distance">En yakın</SelectItem>
          )}
          <SelectItem value="name">A–Z</SelectItem>
        </SelectContent>
      </Select>{" "}
    </>
  );
  const chooseMapPharmacy = (p: Place) => {
    setFocused(p.id);
    setLimit((x) => Math.max(x, results.findIndex((r) => r.id === p.id) + 1));
    if (window.matchMedia("(max-width:800px)").matches) setSelected(p);
    else {
      setSelected(null);
      setScrollTarget(p.id);
    }
  };
  useEffect(() => {
    if (!scrollTarget) return;
    const card = document.getElementById("pharmacy-" + scrollTarget);
    card?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [scrollTarget, limit]);
  const choosePharmacy = (p: Place) => {
    setFocused(p.id);
    setLimit((x) => Math.max(x, results.findIndex((r) => r.id === p.id) + 1));
    setSelected(p);
  };
  const copyAddress = async (p: Place) => {
    try {
      await navigator.clipboard.writeText(p.address);
      toast.success("Adres kopyalandı.");
    } catch {
      toast.error("Adres kopyalanamadı.");
    }
  };
  const copyPhone = async (p: Place) => {
    if (!p.phone) return;
    try {
      await navigator.clipboard.writeText(p.phone);
      toast.success("Telefon numarası kopyalandı.");
    } catch {
      toast.error("Numara kopyalanamadı.");
    }
  };
  const shareSearchArea = async () => {
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("lat", String(location.lat));
    url.searchParams.set("lng", String(location.lng));
    try {
      if (navigator.share)
        await navigator.share({
          title: "Yakınımdaki nöbetçi eczaneler",
          text: location.label,
          url: url.toString(),
        });
      else {
        await navigator.clipboard.writeText(url.toString());
        toast.success("Bölge bağlantısı kopyalandı.");
      }
    } catch {}
  };
  const reportPharmacy = (p: Place) =>
    `mailto:info@simdiacik.com?subject=${encodeURIComponent("Eczane bilgisi düzeltme bildirimi")}&body=${encodeURIComponent(`Merhaba,\n\nŞu eczanenin bilgisini kontrol edebilir misiniz?\n${p.name}\n${p.address}\n${pharmacyMapLink(p)}\n\nDüzeltme:`)}`;
  return (
    <>
      <Toaster position="top-center" richColors />
      <a className="skip-link" href="#eczaneler">
        Eczane sonuçlarına geç
      </a>
      <header className="header">
        <Link className="brand" href="/" aria-label="Şimdi Açık ana sayfa">
          <span className="brand-icon">
            <Plus size={25} strokeWidth={3} />
          </span>
          <span className="brand-name">
            şimdi<span>açık</span>
            <small>NÖBETÇİ ECZANE</small>
          </span>
        </Link>
        <div className="header-actions">
          <Link className="header-link" href="/nobetci-eczane-rehberi">Nasıl çalışır?</Link>
          <button
            className="location"
            onClick={() => setLocOpen(true)}
            aria-label={
              locationChosen
                ? "Seçili bölge: " + location.label + ". Bölgeyi değiştir."
                : "Konum seç"
            }
          >
            <MapPin size={16} />
            <span>
              {locationChosen
                ? location.label.split(",").slice(0, 2).join(",")
                : "Konum seç"}
            </span>
            <ChevronDown size={14} />
          </button>
          <button
            className="icon"
            onClick={changeTheme}
            aria-label={dark ? "Açık temaya geç" : "Koyu temaya geç"}
          >
            {dark ? <Sun size={19} /> : <Moon size={19} />}
          </button>
        </div>
      </header>
      <main className="pharmacy-main" id="eczaneler" tabIndex={-1}>
        <h1 className="sr-only">Yakınındaki nöbetçi eczaneleri bul</h1>
        {!locationChosen && (
          <section
            className="location-start"
            aria-labelledby="location-start-title"
          >
            <div className="location-start-copy">
              <h2 id="location-start-title">Nöbetçi eczane bul</h2>
              <p>
                Bulunduğun bölgeyi seç, nöbetçi eczanelerin adres ve telefonlarına ulaş.
              </p>
            </div>
            <div className="location-start-actions">
              <button
                className="primary"
                disabled={locationPending}
                onClick={requestDeviceLocation}
              >
                <LocateFixed size={17} />
                {locationPending ? "Konum aranıyor…" : "Konumumu kullan"}
              </button>
              <button
                className="location-manual"
                onClick={() => {
                  setLocationTab("region");
                  setLocOpen(true);
                }}
              >
                İl / ilçe seç
              </button>
            </div>
            <p className="signal-note"><MapPin size={13} /> Konum paylaşmadan il ve ilçe seçebilirsin.</p>
            <nav className="signal-cities" aria-label="Popüler şehirler"><span>ŞEHRİNDEN BAŞLA</span>{[["istanbul", "İstanbul"], ["ankara", "Ankara"], ["izmir", "İzmir"], ["bursa", "Bursa"], ["antalya", "Antalya"]].map(([slug, name]) => <Link key={slug} href={"/nobetci-eczane/" + slug}>{name} ↗</Link>)}</nav>
            {geoState && (
              <p className="location-start-status" role="status">
                {geoState}
              </p>
            )}
          </section>
        )}
        {!locationChosen && geoState && !locationPending && (
          <section
            className="location-recovery"
            aria-label="İl ve ilçe ile devam et"
          >
            <RegionPicker city="" onSelect={selectRegion} />
          </section>
        )}
        {locationChosen && (
          <section className="pharmacy-results">
            <div className="results-toolbar">
              <div className="results-overview">
              <div className="section-heading">
                <div className="results-heading-copy">
                  <h2>Nöbetçi eczaneler</h2>
                </div>
                <div className="view-controls">
                  <button
                    className="refresh-button"
                    disabled={loading}
                    onClick={() => setRefresh((v) => v + 1)}
                    aria-label="Eczaneleri yenile"
                  >
                    <RefreshCw size={16} className={loading ? "spin" : ""} />
                  </button>
                  <button
                    className="share-area-button"
                    onClick={() => void shareSearchArea()}
                    aria-label="Bu bölge bağlantısını paylaş"
                    title="Bölgeyi paylaş"
                  >
                    <Share2 size={16} />
                  </button>
                  <button
                    className="mobile-filter"
                    onClick={() => setFilterOpen(true)}
                    aria-label="Eczane filtrelerini aç"
                  >
                    <SlidersHorizontal size={17} />
                    <span>Filtrele</span>
                  </button>
                </div>
              </div>
              <div className="results-context-card">
                <span className="results-context-icon" aria-hidden="true">
                  <MapPin size={19} />
                </span>
                <div className="results-context-body">
                  <strong>{location.label}</strong>
                  {data?.fetchedAt &&
                  Number.isFinite(Date.parse(data.fetchedAt)) ? (
                    <span
                      className="results-context-updated"
                      title={data.source}
                    >
                      Son kontrol <span aria-hidden="true">·</span>{" "}
                      <time dateTime={data.fetchedAt}>
                        {new Date(data.fetchedAt).toLocaleString("tr-TR", {
                          timeZone: "Europe/Istanbul",
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </span>
                  ) : (
                    <span className="results-context-updated">
                      Liste güncelleniyor…
                    </span>
                  )}
                </div>
              </div>
              <div className="results-summary" aria-live="polite">
                <span className="results-count">
                  {loading
                    ? "Aranıyor…"
                    : error
                      ? "Liste alınamadı"
                      : unsupported
                        ? "Resmî liste"
                        : results.length + " eczane"}
                </span>
                {!provinceOverview && !loading && results[0] && (
                  <span
                    className="results-nearest"
                    title="Doğrudan ölçülen yaklaşık mesafe; yol uzunluğu farklı olabilir."
                  >
                    <span>En yakın</span>
                    <b>
                      {distance(
                        results.reduce((a, b) =>
                          a.distance < b.distance ? a : b,
                        ),
                      )}
                    </b>
                  </span>
                )}
              </div>
              </div>
              {data?.partial && (
                <details className="source-quality-disclosure">
                  <summary><Info size={14} /><span>Liste ve konum bilgisi hakkında</span><ChevronDown size={13} /></summary>
                  <p>{(data.warnings?.filter((w) => typeof w === "string").slice(0, 3) ?? []).join(" ") || "Eksik veya doğrulanamayan kayıtlar gösterilmiyor."}</p>
                </details>
              )}
              {sourceDelayed && (
                <p className="source-quality-note" role="status">
                  Kaynak güncellemesi gecikti.{" "}
                  <button onClick={() => setRefresh((v) => v + 1)}>
                    Yeniden kontrol et
                  </button>
                </p>
              )}
              {location.accuracy && location.accuracy > 1000 && (
                <p className="location-accuracy-note" role="status">
                  Konumun yaklaşık görünüyor.{" "}
                  <button
                    onClick={() => {
                      setLocationTab("address");
                      setLocOpen(true);
                    }}
                  >
                    Adresi seç
                  </button>
                </p>
              )}
              <div className="pharmacy-search-row">
                <form
                  className="search"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setDebounced(query);
                  }}
                >
                  <Search size={19} />
                  <input
                    value={query}
                    maxLength={150}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Eczane adı veya adres ara"
                    aria-label="Eczane adı veya adres ara"
                  />
                  {query && (
                    <button
                      type="button"
                      aria-label="Aramayı temizle"
                      onClick={() => setQuery("")}
                    >
                      <X size={17} />
                    </button>
                  )}
                </form>
                <div className="filter-options">{controls}</div>
              </div>
              {provinceOverview ? (
                <div className="distance-toolbar province-overview-toolbar">
                  <span className="distance-label">Tüm İstanbul</span>
                  <button
                    type="button"
                    className="location-manual"
                    onClick={() => setLocOpen(true)}
                  >
                    Konumunu seç
                  </button>
                </div>
              ) : (
                <div className="distance-toolbar">
                  <div
                    className="quick-distances"
                    role="group"
                    aria-label="Hızlı mesafe filtreleri"
                  >
                    {["2", "5", "10", "20"].map((v) => (
                      <button
                        key={v}
                        aria-pressed={radius === v}
                        className={radius === v ? "on" : ""}
                        onClick={() => changeRadius(v)}
                      >
                        {v} km
                      </button>
                    ))}
                    {(query || hasPhone) && (
                      <button className="clear-quick" onClick={clearFilters}>
                        Filtreleri temizle <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            {!online && (
              <div className="coverage-note" role="status">
                İnternet bağlantısı yok. Güncel nöbet listesi için yeniden
                bağlan.
              </div>
            )}
            <div
              className={"results-layout " + (mapMobile ? "mobile-map" : "")}
            >
              <div className="results-list" aria-busy={loading}>
                {loading && !results.length ? (
                  <div className="pharmacy-list">
                    {[1, 2, 3].map((x) => (
                      <div key={x} className="pharmacy-skeleton">
                        <Skeleton className="h-6 w-2/3" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ))}
                  </div>
                ) : officialList && (error || unsupported) ? (
                  <OfficialDistrictList
                    key={location.city}
                    list={officialList}
                    label={location.label}
                  />
                ) : error ? (
                  <div className="empty-state">
                    <Info size={32} />
                    <h3>
                      {online
                        ? "Güncel nöbet listesini kontrol edelim."
                        : "İnternet bağlantını kontrol et."}
                    </h3>
                    <p>
                      Güncel eczane kayıtları alınamadı. Tekrar dene veya resmî
                      nöbet listesini aç.
                    </p>
                    <button
                      className="primary"
                      onClick={() => setRefresh((x) => x + 1)}
                    >
                      Tekrar dene
                    </button>
                    <a
                      href={pharmacySource.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {sourceLinkLabel} <ExternalLink size={14} />
                    </a>
                  </div>
                ) : !results.length ? (
                  <div className="empty-state">
                    <Pill size={32} />
                    <h3>
                      {noResultsAction === "official"
                        ? "Bu il için resmî nöbet listesini aç."
                        : noResultsAction === "refresh"
                          ? "Nöbet listesini yenileyelim."
                          : query || hasPhone
                            ? "Bu filtrelere uyan eczane yok."
                            : "Bu bölgede eczane bulunamadı."}
                    </h3>
                    <p>
                      {noResultsAction === "official"
                        ? "Bu ilde otomatik liste bağlantısı henüz bulunmuyor. Güncel liste için resmî kaynağı kullan."
                        : noResultsAction === "refresh"
                          ? "Güncel eczaneleri görmek için listeyi yenile."
                          : "Kayıt bulunmaması, çevrende nöbetçi eczane olmadığı anlamına gelmez."}
                    </p>
                    <div className="empty-state-actions">
                      {noResultsAction ===
                      "official" ? null : noResultsAction === "refresh" ? (
                        <button
                          className="primary"
                          onClick={() => setRefresh((x) => x + 1)}
                        >
                          Güncel listeyi getir
                        </button>
                      ) : (
                        <>
                          {(query || hasPhone) && (
                            <button
                              className="primary"
                              onClick={clearNarrowFilters}
                            >
                              Filtreleri temizle
                            </button>
                          )}
                          {Number(radius) < 20 && (
                            <button
                              className={query || hasPhone ? "" : "primary"}
                              onClick={() => {
                                clearNarrowFilters();
                                changeRadius("20");
                              }}
                            >
                              20 km içinde ara
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setLocationTab("region");
                              setLocOpen(true);
                            }}
                          >
                            Başka ilçe seç
                          </button>
                        </>
                      )}
                    </div>
                    <a
                      href={pharmacySource.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {sourceLinkLabel} <ExternalLink size={14} />
                    </a>
                  </div>
                ) : (
                  <>
                    <div className="pharmacy-list">
                      {results
                        .slice(0, provinceOverview ? results.length : limit)
                        .map((p, i) => (
                          <PharmacyCard
                            key={p.id}
                            p={p}
                            number={i + 1}
                            now={now}
                            highlighted={hover === p.id || focused === p.id}
                            closest={
                              !provinceOverview &&
                              sort === "distance" &&
                              i === 0
                            }
                            hideDistance={provinceOverview}
                            onOpen={() => choosePharmacy(p)}
                            onHover={setHover}
                            onCopy={() => void copyAddress(p)}
                          />
                        ))}
                    </div>
                    {!provinceOverview && results.length > limit && (
                      <button
                        className="load-more"
                        onClick={() => setLimit((x) => x + 8)}
                      >
                        Diğer {results.length - limit} eczaneyi göster
                      </button>
                    )}
                  </>
                )}
              </div>
              <aside
                className="map-column"
                aria-label="Nöbetçi eczane haritası"
              >
                {(wideScreen || mapMobile) && (
                  <MapBoundary onShowList={() => setMapMobile(false)}>
                    <Suspense
                      fallback={<Skeleton className="h-full min-h-96 w-full" />}
                    >
                      <PlaceMap
                        loading={loading}
                        failed={Boolean(error)}
                        unsupported={unsupported}
                        onRetry={() => setRefresh((v) => v + 1)}
                        onShowList={() => setMapMobile(false)}
                        places={results}
                        center={mapCenter}
                        selected={focused}
                        hovered={hover}
                        onSelect={chooseMapPharmacy}
                        onSearchArea={(lat, lng) => {
                          const attempt = selectionGuard.current.begin();
                          setGeoState("Haritadaki bölge seçiliyor…");
                          const controller = new AbortController();
                          locationRequest.current?.abort();
                          locationRequest.current = controller;
                          void fetchJsonWithRetry<Location>(
                            `/api/location?lat=${lat}&lng=${lng}`,
                            controller.signal,
                            { timeoutMs: 12000 },
                          )
                            .then((d) => {
                              if (!d.city) throw new Error();
                              if (!selectionGuard.current.isCurrent(attempt))
                                return;
                              setLocation({ ...d, lat, lng });
                              setGeoState("");
                            })
                            .catch(() => {
                              if (selectionGuard.current.isCurrent(attempt)) {
                                setGeoState("Bölge belirlenemedi.");
                                toast.error(
                                  "Bölge belirlenemedi. İl ve ilçe seçebilirsin.",
                                );
                              }
                            });
                        }}
                      />
                    </Suspense>
                  </MapBoundary>
                )}
              </aside>
            </div>
          </section>
        )}
      </main>
      <SiteFooter
        sourceUrl={pharmacySource.url}
        onDiscover={() => {
          if (!locationChosen) setLocOpen(true);
          else document.getElementById("eczaneler")?.scrollIntoView();
        }}
        onMap={() => {
          if (!locationChosen) {
            setLocOpen(true);
            return;
          }
          setMapMobile(true);
          document.getElementById("eczaneler")?.scrollIntoView();
        }}
        onLocation={() => setLocOpen(true)}
        onHelp={() => setHelpOpen(true)}
      />
      {locationChosen && (
        <div className="floating-map" role="group" aria-label="Sonuç görünümü">
          <button
            aria-pressed={!mapMobile}
            className={!mapMobile ? "on" : ""}
            onClick={() => setMapMobile(false)}
          >
            <LayoutList size={17} />
            Liste
          </button>
          <button
            aria-pressed={mapMobile}
            className={mapMobile ? "on" : ""}
            onClick={() => setMapMobile(true)}
          >
            <Map size={17} />
            Harita
          </button>
        </div>
      )}
      <Dialog
        open={locOpen}
        onOpenChange={(o) => {
          if (o) setLocOpen(true);
          else closeLocation();
        }}
      >
        <DialogContent
          responsiveBottom
          className="location-dialog"
          onOpenAutoFocus={() => {
            locationOpener.current =
              document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const target = locationOpener.current?.isConnected
              ? locationOpener.current
              : document.querySelector<HTMLElement>(".header .location");
            target?.focus({ preventScroll: true });
          }}
          showCloseButton={false}
        >
          <div className="panel-handle" aria-hidden="true" />
          <button
            className="panel-close"
            onClick={closeLocation}
            aria-label="Kapat"
          >
            <X size={20} />
          </button>
          <div className="location-panel-heading">
            <span>
              <MapPin size={23} />
            </span>
            <div>
              <DialogTitle>Konumunu seç</DialogTitle>
              <DialogDescription>
                Yakınındaki eczaneleri görmek için konumunu kullan.
              </DialogDescription>
            </div>
          </div>
          <button
            className="location-gps"
            disabled={locationPending}
            onClick={requestDeviceLocation}
          >
            <LocateFixed size={20} />
            <span>
              {locationPending ? "Konum aranıyor…" : "Konumumu kullan"}
            </span>
            <ArrowUpRight size={17} />
          </button>
          <p className="location-privacy">
            Konumun eczane araması ve bölgeyi belirlemek için kullanılır.{" "}
            <a href="/kvkk">KVKK</a> · <a href="/gizlilik">Gizlilik</a>
          </p>
          {geoState && (
            <p className="quiet" role="status">
              {geoState}
            </p>
          )}
          <div
            className="location-tabs"
            role="tablist"
            aria-label="Konum seçim yöntemi"
          >
            <button
              id="region-tab"
              role="tab"
              tabIndex={locationTab === "region" ? 0 : -1}
              onKeyDown={locationTabKeys}
              aria-selected={locationTab === "region"}
              aria-controls="region-panel"
              onClick={() => setLocationTab("region")}
            >
              İl / ilçe seç
            </button>
            <button
              id="address-tab"
              role="tab"
              tabIndex={locationTab === "address" ? 0 : -1}
              onKeyDown={locationTabKeys}
              aria-selected={locationTab === "address"}
              aria-controls="address-panel"
              onClick={() => setLocationTab("address")}
            >
              Adres ara
            </button>
          </div>
          {locationTab === "region" ? (
            <div id="region-panel" role="tabpanel" aria-labelledby="region-tab">
              <RegionPicker
                city={location.city}
                district={location.label.split(",")[0]}
                onSelect={selectRegion}
              />
              <label className="remember-region">
                <input
                  type="checkbox"
                  checked={rememberRegion}
                  onChange={(event) => {
                    setRememberRegion(event.target.checked);
                    if (!event.target.checked) clearSavedRegion();
                  }}
                />
                Bu bölgeyi bu cihazda hatırla
              </label>
            </div>
          ) : (
            <div
              id="address-panel"
              role="tabpanel"
              aria-labelledby="address-tab"
            >
              <form
                className="location-search"
                onSubmit={(e) => {
                  e.preventDefault();
                  void searchLocation();
                }}
              >
                <Search size={17} />
                <input
                  aria-label="Şehir, ilçe veya mahalle"
                  placeholder="Mahalle, ilçe veya adres"
                  value={locQuery}
                  onChange={(e) => {
                    locationRequest.current?.abort();
                    setLocLoading(false);
                    setLocQuery(e.target.value);
                    setLocResults([]);
                    setLocError("");
                  }}
                  minLength={3}
                  required
                />
                <button disabled={locLoading}>
                  {locLoading ? "Aranıyor…" : "Ara"}
                </button>
              </form>
              {locError && (
                <p className="location-panel-error" role="alert">
                  {locError}
                </p>
              )}
              <div className="location-results">
                {locResults.map((l) => (
                  <button
                    key={l.label}
                    onClick={() => {
                      setLocation(l);
                      setLocOpen(false);
                      setGeoState("");
                    }}
                  >
                    <MapPin size={16} />
                    <span>{l.label}</span>
                    <ArrowUpRight size={15} />
                  </button>
                ))}
              </div>
            </div>
          )}
          <button className="forget-location" onClick={forgetLocation}>
            Kayıtlı konumu sil
          </button>
        </DialogContent>
      </Dialog>
      <Sheet
        open={Boolean(selected)}
        onOpenChange={(o) => {
          if (!o) setSelected(null);
        }}
      >
        <SheetContent
          side="bottom"
          className="detail-sheet"
          showCloseButton={false}
        >
          {selected && (
            <PharmacyDetail
              place={selected}
              hideDistance={provinceOverview}
              now={now}
              onClose={() => setSelected(null)}
              onCopy={() => void copyAddress(selected)}
              onCopyPhone={() => void copyPhone(selected)}
              onShare={() => void share(selected)}
              reportUrl={reportPharmacy(selected)}
            />
          )}
        </SheetContent>
      </Sheet>
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="bottom" className="filter-sheet">
          <SheetTitle>Eczane filtreleri</SheetTitle>
          <SheetDescription>
            Arama mesafesini ve telefon bilgisini seç.
          </SheetDescription>
          <div>{controls}</div>
          <button className="primary" onClick={() => setFilterOpen(false)}>
            {loading ? "Listeye dön" : `${results.length} eczaneyi göster`}
          </button>
          <button className="clear-filters" onClick={clearFilters}>
            Filtreleri temizle
          </button>
        </SheetContent>
      </Sheet>
      <Sheet open={helpOpen} onOpenChange={setHelpOpen}>
        <SheetContent side="bottom" className="menu-sheet">
          <SheetTitle>Nöbetçi eczaneyi nasıl bulurum?</SheetTitle>
          <SheetDescription>Üç kolay adımda eczaneye ulaş.</SheetDescription>
          <h3>1. Konumunu seç</h3>
          <p>
            Konumumu kullan düğmesine dokun veya il ve ilçe seç. Konum izni
            vermeden de arama yapabilirsin. Daha önce konum izni verdiysen
            bulunduğun bölge otomatik belirlenir.
          </p>
          <h3>2. Listeyi veya haritayı incele</h3>
          <p>
            Eczaneler yakınlık sırasıyla gösterilir. Kartlardaki numaralar
            haritadaki pinlerle eşleşir.{" "}
          </p>
          <h3>3. Ara ve yol tarifi al</h3>
          <p>
            Pin veya eczane adına dokun. Gitmeden önce Ara düğmesiyle telefonla
            teyit et; Yol tarifi ile harita uygulamasını aç.
          </p>
        </SheetContent>
      </Sheet>
    </>
  );
}

