import {normalized} from './places';

/**
 * Official per-district duty pages for provinces whose list cannot be read by this server.
 * İstanbul and Yalova: the chamber publishes one page per district; it forbids embedding, so the
 * visitor is sent straight to their district's page. Ordu: the chamber embeds per-district lists that
 * allow embedding, so they open inside the site, in the visitor's own browser.
 */
export type OfficialDistrictPage = { district: string; url: string };
export type OfficialList = { source: string; mode: 'link' | 'embed'; pages: OfficialDistrictPage[] };

const ieo = (pairs: [string, number][]) =>
  pairs.map(([district, id]) => ({ district, url: `https://www.istanbuleczaciodasi.org.tr/nobetci-eczane/?ilce=${id}` }));

export const ORDU_DISTRICT_LISTS: OfficialDistrictPage[] = ([
  ['Altınordu', 701], ['Fatsa', 706], ['Ünye', 718], ['Perşembe', 716], ['Kumru', 714], ['Korgan', 713], ['Akkuş', 700],
  ['Aybastı', 702], ['Çamaş', 703], ['Çatalpınar', 704], ['Çaybaşı', 705], ['Gölköy', 707], ['Gülyalı', 708], ['Gürgentepe', 709],
  ['İkizce', 710], ['Kabadüz', 711], ['Kabataş', 712], ['Mesudiye', 715], ['Ulubey', 717],
] as [string, number][]).map(([district, id]) => ({ district, url: `https://ordu.eczanesistemi.net/list/${id}` }));

const lists: Record<string, OfficialList> = {
  istanbul: { source: 'İstanbul Eczacı Odası', mode: 'link', pages: ieo([
    ['Adalar', 1], ['Arnavutköy', 34], ['Ataşehir', 38], ['Avcılar', 2], ['Bağcılar', 3], ['Bahçelievler', 5], ['Bakırköy', 4],
    ['Başakşehir', 39], ['Bayrampaşa', 6], ['Beşiktaş', 7], ['Beykoz', 8], ['Beylikdüzü', 35], ['Beyoğlu', 9], ['Büyükçekmece', 10],
    ['Çatalca', 11], ['Çekmeköy', 40], ['Esenler', 14], ['Esenyurt', 36], ['Eyüpsultan', 13], ['Fatih', 15], ['Gaziosmanpaşa', 16],
    ['Güngören', 17], ['Kadıköy', 18], ['Kağıthane', 19], ['Kartal', 20], ['Küçükçekmece', 21], ['Maltepe', 22], ['Pendik', 23],
    ['Sancaktepe', 41], ['Sarıyer', 24], ['Silivri', 25], ['Sultanbeyli', 26], ['Sultangazi', 37], ['Şile', 27], ['Şişli', 28],
    ['Tuzla', 29], ['Ümraniye', 30], ['Üsküdar', 31], ['Zeytinburnu', 33],
  ]) },
  yalova: { source: 'İstanbul Eczacı Odası · Yalova', mode: 'link', pages: ieo([
    ['Merkez', 32], ['Altınova', 42], ['Armutlu', 43], ['Çınarcık', 44], ['Çiftlikköy', 45], ['Termal', 46],
  ]) },
  ordu: { source: 'Ordu Eczacı Odası', mode: 'embed', pages: ORDU_DISTRICT_LISTS },
};

export const officialListFor = (city: string) => lists[normalized(city).trim()];

/** The district a location label names ("Moda, Kadıköy, İstanbul"), if the list has a page for it. */
export function districtInLabel(list: OfficialList, label: string) {
  const parts = label.split(/[,·]/).map((part) => normalized(part).trim());
  return list.pages.find((page) => parts.includes(normalized(page.district))) ?? (parts.includes('eyup') ? list.pages.find((page) => page.district === 'Eyüpsultan') : undefined);
}
