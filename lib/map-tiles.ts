const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );

export function mapTileConfig(
  url = process.env.NEXT_PUBLIC_MAP_TILE_URL,
  credit = process.env.NEXT_PUBLIC_MAP_TILE_CREDIT,
  creditUrl = process.env.NEXT_PUBLIC_MAP_TILE_CREDIT_URL,
) {
  if (!url)
    return {
      url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    };
  const target = new URL(url);
  if (
    target.protocol !== "https:" ||
    target.username ||
    target.password ||
    !url.includes("{z}") ||
    !url.includes("{x}") ||
    !url.includes("{y}") ||
    !credit ||
    !creditUrl
  )
    throw new Error(
      "Harita sağlayıcısı için HTTPS döşeme adresi ve kaynak bilgisi gerekli.",
    );
  const source = new URL(creditUrl);
  if (source.protocol !== "https:")
    throw new Error("Harita kaynak bağlantısı HTTPS olmalı.");
  return {
    url,
    attribution: `<a href="${escapeHtml(source.href)}">${escapeHtml(credit)}</a>`,
  };
}
