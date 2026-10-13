"use client";

export function CookieSettingsButton() {
  return (
    <button
      type="button"
      className="cookie-settings-button"
      onClick={() =>
        window.dispatchEvent(new Event("simdiacik:open-cookie-settings"))
      }
    >
      Çerez tercihlerini değiştir
    </button>
  );
}
