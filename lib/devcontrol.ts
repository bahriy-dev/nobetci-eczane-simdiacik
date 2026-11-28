"use client";
/**
 * DevControl usage analytics (the owner's monitoring panel): page views plus a few anonymous steps
 * (search started → results → directions). Events carry only categories such as the search method and a
 * result-count bucket — never coordinates, addresses or what was typed. Nothing loads or is sent until the
 * visitor allows analytics; choosing "essential only" stops it and clears its queue.
 */
export const DEVCONTROL_KEY = process.env.NEXT_PUBLIC_DEVCONTROL_KEY ?? "";
export const DEVCONTROL_ORIGIN = (
  process.env.NEXT_PUBLIC_DEVCONTROL_ORIGIN ?? "https://devcontrol.up.railway.app"
).replace(/\/$/, "");

type Dca = (...args: unknown[]) => void;
declare global {
  interface Window {
    dca?: Dca;
    dcq?: unknown[];
  }
}

export function loadDevControl() {
  if (!DEVCONTROL_KEY || typeof window === "undefined") return;
  if (!window.dca) {
    window.dcq = window.dcq || [];
    window.dca = function dca(...args: unknown[]) {
      window.dcq!.push(args);
    };
    const script = document.createElement("script");
    script.async = true;
    script.src = `${DEVCONTROL_ORIGIN}/a/t.js`;
    script.dataset.key = DEVCONTROL_KEY;
    script.dataset.endpoint = `${DEVCONTROL_ORIGIN}/api/a/collect`;
    document.head.appendChild(script);
  }
  window.dca("consent", true);
}

export function stopDevControl() {
  if (typeof window !== "undefined") window.dca?.("consent", false);
}

/** Sends a product event when analytics is active; otherwise does nothing. Never throws. */
export function track(name: string, props?: Record<string, string | number | boolean>) {
  try {
    window.dca?.("track", name, props ?? {});
  } catch {
    /* analytics must never break the site */
  }
}

/** Result-count bucket: the exact number is not needed and is not sent. */
export const countBucket = (n: number) => (n === 0 ? "0" : n <= 5 ? "1-5" : n <= 20 ? "6-20" : "20+");
