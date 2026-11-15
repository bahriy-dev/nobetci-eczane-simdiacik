import Link from "next/link";

export function SiteMark() {
  return (
    <Link className="brand" href="/" aria-label="Şimdi Açık ana sayfa">
      <span className="brand-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path
            fill="currentColor"
            d="M10.2 2.5h3.6v7.7h7.7v3.6h-7.7v7.7h-3.6v-7.7H2.5v-3.6h7.7V2.5z"
          />
        </svg>
      </span>
      <span className="brand-name">
        şimdi<span>açık</span>
        <small>Nöbetçi eczane</small>
      </span>
    </Link>
  );
}
