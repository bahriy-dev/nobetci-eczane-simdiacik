"use client";
import Link from "next/link";

export default function SearchError({ reset }: { reset: () => void }) {
  return (
    <main className="service-error">
      <Link href="/" className="service-error-brand">
        şimdi açık
      </Link>
      <h1>Aramayı yeniden açalım.</h1>
      <p>
        Bu sayfa şu anda tamamlanamadı. Yeniden deneyebilir veya ana sayfadan
        bölgeni seçebilirsin.
      </p>
      <div>
        <button className="primary" onClick={reset}>
          Tekrar dene
        </button>
        <Link href="/">Ana sayfaya dön</Link>
      </div>
    </main>
  );
}
