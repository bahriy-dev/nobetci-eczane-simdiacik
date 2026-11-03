"use client";
let sessionTheme: boolean | undefined;
export const resolveTheme = (stored: string | null, systemDark: boolean) =>
  stored === "dark" || (stored !== "light" && systemDark);
const themeEvent = "simdiacik-theme-change";
export const subscribeTheme = (notify: () => void) => {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const change = () => {
    document.documentElement.classList.toggle("dark", readTheme());
    notify();
  };
  window.addEventListener("storage", change);
  window.addEventListener(themeEvent, change);
  media.addEventListener("change", change);
  return () => {
    window.removeEventListener("storage", change);
    window.removeEventListener(themeEvent, change);
    media.removeEventListener("change", change);
  };
};
export const readTheme = () => {
  if (sessionTheme !== undefined) return sessionTheme;
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  try {
    return resolveTheme(localStorage.getItem("simdiacik-theme"), systemDark);
  } catch {
    return systemDark;
  }
};
export const serverTheme = () => false;
export function writeTheme(dark: boolean) {
  try {
    localStorage.setItem("simdiacik-theme", dark ? "dark" : "light");
    sessionTheme = undefined;
  } catch {
    sessionTheme = dark;
  }
  // Colours switch at once: per-element transitions would show light text on a still-light card.
  const root = document.documentElement;
  root.classList.add("theme-switching");
  root.classList.toggle("dark", dark);
  window.dispatchEvent(new Event(themeEvent));
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("theme-switching")));
}
export const subscribeNetwork = (notify: () => void) => {
  window.addEventListener("online", notify);
  window.addEventListener("offline", notify);
  return () => {
    window.removeEventListener("online", notify);
    window.removeEventListener("offline", notify);
  };
};
export const readNetwork = () => navigator.onLine;
export const serverNetwork = () => true;
