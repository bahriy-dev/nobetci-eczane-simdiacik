"use client";

import Script from "next/script";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  readAnalyticsChoice,
  saveAnalyticsChoice,
  type AnalyticsChoice,
} from "@/lib/analytics-consent";

const tagManager =
  "(function(w,d,s,l,i){w[l]=w[l]||[];w.gtag=w.gtag||function(){w[l].push(arguments)};w.gtag('consent','default',{ad_storage:'denied',analytics_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',functionality_storage:'granted',security_storage:'granted'});w.gtag('consent','update',{analytics_storage:'granted'});w.gtag('set',{page_location:w.location.origin+w.location.pathname});w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!=='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-W9HWBWGB');";
const consentEvent = "simdiacik:open-cookie-settings";
const choiceEvent = "simdiacik:analytics-choice-change";
type ConsentSnapshot = AnalyticsChoice | "unset" | "pending";

function subscribeChoice(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(choiceEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(choiceEvent, onChange);
  };
}

function readChoiceSnapshot(): ConsentSnapshot {
  try {
    return readAnalyticsChoice(window.localStorage) ?? "unset";
  } catch {
    return "unset";
  }
}

function serverChoiceSnapshot(): ConsentSnapshot {
  return "pending";
}

function updateTagConsent(choice: AnalyticsChoice) {
  const target = window as Window & {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  };
  target.dataLayer = target.dataLayer || [];
  target.gtag =
    target.gtag ||
    function (...args: unknown[]) {
      target.dataLayer?.push(args);
    };
  target.gtag("consent", "update", {
    analytics_storage: choice === "analytics" ? "granted" : "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}

function clearAnalyticsCookies() {
  for (const item of document.cookie.split(";")) {
    const name = item.split("=", 1)[0]?.trim();
    if (
      name &&
      (name === "_ga" ||
        name.startsWith("_ga_") ||
        name === "_gid" ||
        name === "_gat")
    ) {
      document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
      for (const domain of [
        window.location.hostname,
        "simdiacik.com",
        ".simdiacik.com",
      ])
        document.cookie = `${name}=; Max-Age=0; Path=/; Domain=${domain}; SameSite=Lax`;
    }
  }
}

export function openAnalyticsSettings() {
  window.dispatchEvent(new Event(consentEvent));
}

export function AnalyticsConsent() {
  const storedChoice = useSyncExternalStore(
    subscribeChoice,
    readChoiceSnapshot,
    serverChoiceSnapshot,
  );
  const [sessionChoice, setSessionChoice] = useState<AnalyticsChoice | null>(
    null,
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const previousChoice = useRef<AnalyticsChoice | null>(null);
  const choice =
    sessionChoice ??
    (storedChoice === "analytics" || storedChoice === "essential"
      ? storedChoice
      : null);
  const open =
    settingsOpen || (storedChoice === "unset" && sessionChoice === null);

  useEffect(() => {
    const show = () => setSettingsOpen(true);
    window.addEventListener(consentEvent, show);
    return () => window.removeEventListener(consentEvent, show);
  }, []);

  useEffect(() => {
    if (!choice) return;
    updateTagConsent(choice);
    if (choice === "essential") {
      clearAnalyticsCookies();
      if (previousChoice.current === "analytics") window.location.reload();
    }
    previousChoice.current = choice;
  }, [choice]);

  const choose = useCallback((next: AnalyticsChoice) => {
    let saved = false;
    try {
      saveAnalyticsChoice(window.localStorage, next);
      saved = true;
    } catch {
      /* Keep the choice for this page when storage is blocked. */
    }
    setSessionChoice(saved ? null : next);
    setSettingsOpen(false);
    window.dispatchEvent(new Event(choiceEvent));
  }, []);

  return (
    <>
      {choice === "analytics" && (
        <Script
          id="google-tag-manager"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: tagManager }}
        />
      )}
      {open && (
        <aside
          className="consent-banner"
          aria-label="Çerez tercihleri"
          aria-describedby="consent-description"
          role="region"
        >
          <div className="consent-copy">
            <b>Gizlilik tercihin</b>
            <p id="consent-description">
              Gerekli depolama siteyi çalıştırır. Analitik etiketleri yalnızca
              izin verirsen yüklenir. <a href="/cerez-politikasi">Ayrıntılar</a>
            </p>
          </div>
          <div className="consent-actions">
            <button
              className="consent-essential"
              onClick={() => choose("essential")}
            >
              Yalnızca gerekli
            </button>
            <button
              className="consent-analytics"
              onClick={() => choose("analytics")}
            >
              Analitiğe izin ver
            </button>
          </div>
        </aside>
      )}
      <span className="sr-only" aria-live="polite">
        {choice === "essential"
          ? "Yalnızca gerekli depolama seçildi."
          : choice === "analytics"
            ? "Analitik etiketleri için izin verildi."
            : ""}
      </span>
    </>
  );
}
