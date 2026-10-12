export type PharmacySource = {
  name: string;
  url: string;
  kind: 'duty-list' | 'chamber' | 'directory';
};

export type ProvinceChamber = {
  provinceId: number;
  province: string;
  chamberId: number;
  chamber: string;
  url: string;
};

/** Public TEB directory snapshot; the serialized JSON was decoded without executing page scripts. */
export const PHARMACY_SOURCE_PROVENANCE = Object.freeze({
  sourceUrl: 'https://teb.org.tr/odalar',
  chamberTableUrl: 'https://www.teb.org.tr/content/00f1d445-5d27-410c-8402-0b60ce0d6182/bolge-eczaci-odalari-listesi',
  retrievedAt: '2026-10-07',
  provinceCount: 81,
  chamberCount: 60,
});

// Membership comes directly from TEB, including chambers responsible for several provinces.
export const PHARMACY_CHAMBERS: readonly Readonly<ProvinceChamber>[] = Object.freeze([
  {provinceId: 1, province: "Adana", chamberId: 4, chamber: "Adana Eczacı Odası", url: "https://adanaeo.org.tr"},
  {provinceId: 2, province: "Adıyaman", chamberId: 51, chamber: "Adıyaman Eczacı Odası", url: "https://adiyamaneo.org.tr"},
  {provinceId: 3, province: "Afyonkarahisar", chamberId: 33, chamber: "Afyonkarahisar Eczacı Odası", url: "https://afyoneczaciodasi.org.tr"},
  {provinceId: 4, province: "Ağrı", chamberId: 55, chamber: "Ağrı Eczacı Odası", url: "https://agrieo.org.tr"},
  {provinceId: 5, province: "Amasya", chamberId: 47, chamber: "Amasya Eczacı Odası", url: "https://amasyaeo.org.tr"},
  {provinceId: 6, province: "Ankara", chamberId: 2, chamber: "Ankara Eczacı Odası", url: "https://aeo.org.tr"},
  {provinceId: 7, province: "Antalya", chamberId: 10, chamber: "Antalya Eczacı Odası", url: "https://antalyaeo.org.tr"},
  {provinceId: 8, province: "Artvin", chamberId: 18, chamber: "Trabzon Eczacı Odası", url: "https://trabzoneczaciodasi.org.tr"},
  {provinceId: 9, province: "Aydın", chamberId: 21, chamber: "Aydın Eczacı Odası", url: "https://aydineczaciodasi.org.tr"},
  {provinceId: 10, province: "Balıkesir", chamberId: 30, chamber: "Balıkesir Eczacı Odası", url: "https://balikesireczaciodasi.org.tr"},
  {provinceId: 11, province: "Bilecik", chamberId: 9, chamber: "Eskişehir Eczacı Odası", url: "https://eskisehireo.org.tr"},
  {provinceId: 12, province: "Bingöl", chamberId: 23, chamber: "Elazığ Eczacı Odası", url: "https://elazigeczaciodasi.org.tr"},
  {provinceId: 13, province: "Bitlis", chamberId: 38, chamber: "Van Eczacı Odası", url: "https://vaneczaciodasi.org.tr"},
  {provinceId: 14, province: "Bolu", chamberId: 20, chamber: "Sakarya Eczacı Odası", url: "https://seo.org.tr"},
  {provinceId: 15, province: "Burdur", chamberId: 54, chamber: "Burdur Eczacı Odası", url: "https://burdureo.org.tr"},
  {provinceId: 16, province: "Bursa", chamberId: 7, chamber: "Bursa Eczacı Odası", url: "https://beo.org.tr"},
  {provinceId: 17, province: "Çanakkale", chamberId: 36, chamber: "Çanakkale Eczacı Odası", url: "https://canakkaleeo.org.tr"},
  {provinceId: 18, province: "Çankırı", chamberId: 26, chamber: "Kastamonu Eczacı Odası", url: "https://kastamonueo.org.tr"},
  {provinceId: 19, province: "Çorum", chamberId: 45, chamber: "Çorum Eczacı Odası", url: "https://corumeo.org.tr"},
  {provinceId: 20, province: "Denizli", chamberId: 16, chamber: "Denizli Eczacı Odası", url: "https://denizlieczaciodasi.org.tr"},
  {provinceId: 21, province: "Diyarbakır", chamberId: 11, chamber: "Diyarbakır Eczacı Odası", url: "https://diyarbakireo.org.tr"},
  {provinceId: 22, province: "Edirne", chamberId: 39, chamber: "Edirne Eczacı Odası", url: "https://edirneeo.org.tr"},
  {provinceId: 23, province: "Elazığ", chamberId: 23, chamber: "Elazığ Eczacı Odası", url: "https://elazigeczaciodasi.org.tr"},
  {provinceId: 24, province: "Erzincan", chamberId: 56, chamber: "Erzincan Eczacı Odası", url: "https://erzincaneo.org.tr"},
  {provinceId: 25, province: "Erzurum", chamberId: 13, chamber: "Erzurum Eczacı Odası", url: "https://erzurumeo.org.tr"},
  {provinceId: 26, province: "Eskişehir", chamberId: 9, chamber: "Eskişehir Eczacı Odası", url: "https://eskisehireo.org.tr"},
  {provinceId: 27, province: "Gaziantep", chamberId: 8, chamber: "Gaziantep Eczacı Odası", url: "https://gaziantepeczaciodasi.com"},
  {provinceId: 28, province: "Giresun", chamberId: 42, chamber: "Giresun Eczacı Odası", url: "https://giresuneczaciodasi.org.tr"},
  {provinceId: 29, province: "Gümüşhane", chamberId: 18, chamber: "Trabzon Eczacı Odası", url: "https://trabzoneczaciodasi.org.tr"},
  {provinceId: 30, province: "Hakkari", chamberId: 38, chamber: "Van Eczacı Odası", url: "https://vaneczaciodasi.org.tr"},
  {provinceId: 31, province: "Hatay", chamberId: 28, chamber: "Hatay Eczacı Odası", url: "https://hatayeo.org.tr"},
  {provinceId: 32, province: "Isparta", chamberId: 15, chamber: "Isparta Eczacı Odası", url: "https://ispartaeo.org.tr"},
  {provinceId: 33, province: "Mersin", chamberId: 25, chamber: "Mersin Eczacı Odası", url: "https://mersineczaciodasi.org.tr"},
  {provinceId: 34, province: "İstanbul", chamberId: 1, chamber: "İstanbul Eczacı Odası", url: "https://istanbuleczaciodasi.org.tr"},
  {provinceId: 35, province: "İzmir", chamberId: 3, chamber: "İzmir Eczacı Odası", url: "https://izmireczaciodasi.org.tr"},
  {provinceId: 36, province: "Kars", chamberId: 13, chamber: "Erzurum Eczacı Odası", url: "https://erzurumeo.org.tr"},
  {provinceId: 37, province: "Kastamonu", chamberId: 26, chamber: "Kastamonu Eczacı Odası", url: "https://kastamonueo.org.tr"},
  {provinceId: 38, province: "Kayseri", chamberId: 12, chamber: "Kayseri Eczacı Odası", url: "https://kayserieo.org.tr"},
  {provinceId: 39, province: "Kırklareli", chamberId: 40, chamber: "Kırklareli Eczacı Odası", url: "https://kirklarelieo.org.tr"},
  {provinceId: 40, province: "Kırşehir", chamberId: 34, chamber: "Aksaray Eczacı Odası", url: "https://aksarayeo.org.tr"},
  {provinceId: 41, province: "Kocaeli", chamberId: 31, chamber: "Kocaeli Eczacı Odası", url: "https://kocaelieo.org.tr"},
  {provinceId: 42, province: "Konya", chamberId: 5, chamber: "Konya Eczacı Odası", url: "https://keo.org.tr"},
  {provinceId: 43, province: "Kütahya", chamberId: 35, chamber: "Kütahya Eczacı Odası", url: "https://kutahyaeo.org.tr"},
  {provinceId: 44, province: "Malatya", chamberId: 22, chamber: "Malatya Eczacı Odası", url: "https://malatyaeczaciodasi.org.tr"},
  {provinceId: 45, province: "Manisa", chamberId: 29, chamber: "Manisa Eczacı Odası", url: "https://manisaeczaciodasi.org.tr"},
  {provinceId: 46, province: "Kahramanmaraş", chamberId: 14, chamber: "Kahramanmaraş Eczacı Odası", url: "https://kahramanmaraseo.org.tr"},
  {provinceId: 47, province: "Mardin", chamberId: 43, chamber: "Mardin Eczacı Odası", url: "https://mardineczaciodasi.org.tr"},
  {provinceId: 48, province: "Muğla", chamberId: 32, chamber: "Muğla Eczacı Odası", url: "https://muglaeczaciodasi.org.tr"},
  {provinceId: 49, province: "Muş", chamberId: 44, chamber: "Batman Eczacı Odası", url: "https://batmaneczaciodasi.org.tr"},
  {provinceId: 50, province: "Nevşehir", chamberId: 52, chamber: "Nevşehir Eczacı Odası", url: "https://nevsehireo.org.tr"},
  {provinceId: 51, province: "Niğde", chamberId: 53, chamber: "Niğde Eczacı Odası", url: "https://neo.org.tr"},
  {provinceId: 52, province: "Ordu", chamberId: 24, chamber: "Ordu Eczacı Odası", url: "https://ordueczaciodasi.org.tr"},
  {provinceId: 53, province: "Rize", chamberId: 60, chamber: "Rize Eczacı Odası", url: "https://rizeeczaciodasi.org.tr/"},
  {provinceId: 54, province: "Sakarya", chamberId: 20, chamber: "Sakarya Eczacı Odası", url: "https://seo.org.tr"},
  {provinceId: 55, province: "Samsun", chamberId: 6, chamber: "Samsun Eczacı Odası", url: "https://samsuneczaciodasi.org.tr"},
  {provinceId: 56, province: "Siirt", chamberId: 59, chamber: "Siirt Eczacı Odası", url: "https://siirteo.org.tr"},
  {provinceId: 57, province: "Sinop", chamberId: 6, chamber: "Samsun Eczacı Odası", url: "https://samsuneczaciodasi.org.tr"},
  {provinceId: 58, province: "Sivas", chamberId: 37, chamber: "Sivas Eczacı Odası", url: "https://sivaseo.org.tr"},
  {provinceId: 59, province: "Tekirdağ", chamberId: 19, chamber: "Tekirdağ Eczacı Odası", url: "https://teo.org.tr"},
  {provinceId: 60, province: "Tokat", chamberId: 41, chamber: "Tokat Eczacı Odası", url: "https://tokateo.org"},
  {provinceId: 61, province: "Trabzon", chamberId: 18, chamber: "Trabzon Eczacı Odası", url: "https://trabzoneczaciodasi.org.tr"},
  {provinceId: 62, province: "Tunceli", chamberId: 23, chamber: "Elazığ Eczacı Odası", url: "https://elazigeczaciodasi.org.tr"},
  {provinceId: 63, province: "Şanlıurfa", chamberId: 27, chamber: "Şanlıurfa Eczacı Odası", url: "https://sanliurfaeo.org.tr"},
  {provinceId: 64, province: "Uşak", chamberId: 46, chamber: "Uşak Eczacı Odası", url: "https://usakeczaciodasi.org.tr"},
  {provinceId: 65, province: "Van", chamberId: 38, chamber: "Van Eczacı Odası", url: "https://vaneczaciodasi.org.tr"},
  {provinceId: 66, province: "Yozgat", chamberId: 49, chamber: "Yozgat Eczacı Odası", url: "https://yozgateo.org.tr"},
  {provinceId: 67, province: "Zonguldak", chamberId: 17, chamber: "Zonguldak Eczacı Odası", url: "https://zeo.org.tr"},
  {provinceId: 68, province: "Aksaray", chamberId: 34, chamber: "Aksaray Eczacı Odası", url: "https://aksarayeo.org.tr"},
  {provinceId: 69, province: "Bayburt", chamberId: 13, chamber: "Erzurum Eczacı Odası", url: "https://erzurumeo.org.tr"},
  {provinceId: 70, province: "Karaman", chamberId: 50, chamber: "Karaman Eczacı Odası", url: "https://karamaneo.org.tr"},
  {provinceId: 71, province: "Kırıkkale", chamberId: 2, chamber: "Ankara Eczacı Odası", url: "https://aeo.org.tr"},
  {provinceId: 72, province: "Batman", chamberId: 44, chamber: "Batman Eczacı Odası", url: "https://batmaneczaciodasi.org.tr"},
  {provinceId: 73, province: "Şırnak", chamberId: 58, chamber: "Şırnak Eczacı Odası", url: "https://sirnakeo.org.tr"},
  {provinceId: 74, province: "Bartın", chamberId: 17, chamber: "Zonguldak Eczacı Odası", url: "https://zeo.org.tr"},
  {provinceId: 75, province: "Ardahan", chamberId: 13, chamber: "Erzurum Eczacı Odası", url: "https://erzurumeo.org.tr"},
  {provinceId: 76, province: "Iğdır", chamberId: 13, chamber: "Erzurum Eczacı Odası", url: "https://erzurumeo.org.tr"},
  {provinceId: 77, province: "Yalova", chamberId: 1, chamber: "İstanbul Eczacı Odası", url: "https://istanbuleczaciodasi.org.tr"},
  {provinceId: 78, province: "Karabük", chamberId: 26, chamber: "Kastamonu Eczacı Odası", url: "https://kastamonueo.org.tr"},
  {provinceId: 79, province: "Kilis", chamberId: 8, chamber: "Gaziantep Eczacı Odası", url: "https://gaziantepeczaciodasi.com"},
  {provinceId: 80, province: "Osmaniye", chamberId: 48, chamber: "Osmaniye Eczacı Odası", url: "https://osmaniyeeczaciodasi.org.tr"},
  {provinceId: 81, province: "Düzce", chamberId: 57, chamber: "Düzce Eczacı Odası", url: "https://duzceeo.org"},
].map(chamber => Object.freeze(chamber)));

type VerifiedDutyList = {
  provinceId: number;
  name: string;
  url: string;
  evidenceUrl: string;
};

const verifiedAt = '2026-10-07';
/**
 * Verified public duty-page links. A link does not assert successful server retrieval
 * or that an individual pharmacy is currently on duty.
 */
export const VERIFIED_PHARMACY_DUTY_SOURCES: readonly Readonly<VerifiedDutyList & {verifiedAt: string}>[] = Object.freeze([
  {provinceId: 1, name: 'Adana Eczacı Odası', url: 'https://www.adanaeo.org.tr/nobetci-eczaneler', evidenceUrl: 'https://www.adanaeo.org.tr/nobetci-eczaneler'},
  {provinceId: 6, name: 'Ankara Eczacı Odası', url: 'https://www.aeo.org.tr/nobetci-eczaneler', evidenceUrl: 'https://www.aeo.org.tr/nobetci-eczaneler'},
  {provinceId: 7, name: 'Antalya Eczacı Odası', url: 'https://www.antalyaeo.org.tr/tr/nobetci-eczaneler', evidenceUrl: 'https://www.antalyaeo.org.tr/tr/nobetci-eczaneler'},
  {provinceId: 16, name: 'Bursa Eczacı Odası', url: 'https://www.beo.org.tr/nobetci-eczaneler', evidenceUrl: 'https://www.beo.org.tr/nobetci-eczaneler'},
  {provinceId: 26, name: 'Eskişehir Eczacı Odası', url: 'https://www.eskisehireo.org.tr/nobetkarti', evidenceUrl: 'https://www.eskisehireo.org.tr/nobetkarti'},
  {provinceId: 27, name: 'Gaziantep Eczacı Odası', url: 'https://www.gaziantepeo.org.tr/nobet-karti', evidenceUrl: 'https://www.gaziantepeo.org.tr/nobet-karti'},
  {provinceId: 33, name: 'Mersin Eczacı Odası', url: 'https://www.mersineczaciodasi.org.tr/nobetci-eczaneler', evidenceUrl: 'https://www.mersineczaciodasi.org.tr/nobetci-eczaneler'},
  {provinceId: 34, name: 'İstanbul Eczacı Odası', url: 'https://www.istanbuleczaciodasi.org.tr/nobetci-eczane/', evidenceUrl: 'https://www.istanbuleczaciodasi.org.tr/nobetci-eczane/'},
  {provinceId: 35, name: 'İzmir Büyükşehir Belediyesi', url: 'https://www.izmir.bel.tr/tr/NobetciEczane/27', evidenceUrl: 'https://www.izmir.bel.tr/tr/NobetciEczane/27'},
  {provinceId: 38, name: 'Kayseri Büyükşehir Belediyesi · Kayseri Eczacı Odası', url: 'https://cbs.kayseri.bel.tr/kayseri-nobetci-eczaneler', evidenceUrl: 'https://cbs.kayseri.bel.tr/kayseri-nobetci-eczaneler'},
  {provinceId: 41, name: 'Kocaeli Eczacı Odası', url: 'https://www.kocaelieo.org.tr/nobetci-eczaneler', evidenceUrl: 'https://www.kocaelieo.org.tr/nobetci-eczaneler'},
  {provinceId: 42, name: 'Konya Eczacı Odası', url: 'https://www.konyanobetcieczaneleri.com', evidenceUrl: 'https://keo.org.tr'},
  {provinceId: 55, name: 'Samsun Eczacı Odası', url: 'https://www.samsuneczaciodasi.org.tr/nobetci-eczaneler', evidenceUrl: 'https://www.samsuneczaciodasi.org.tr/nobetci-eczaneler'},
  // The official page explicitly publishes both Samsun and Sinop lists.
  {provinceId: 57, name: 'Samsun Eczacı Odası · Sinop nöbet listesi', url: 'https://www.samsuneczaciodasi.org.tr/nobetci-eczaneler', evidenceUrl: 'https://www.samsuneczaciodasi.org.tr/nobetci-eczaneler'},
  {provinceId: 61, name: 'Trabzon Eczacı Odası', url: 'https://www.trabzoneczaciodasi.org.tr/nobetci-eczaneler', evidenceUrl: 'https://www.trabzoneczaciodasi.org.tr/nobetci-eczaneler'},
  // The normal public marker response explicitly includes province Yalova.
  {provinceId: 77, name: 'İstanbul Eczacı Odası · Yalova nöbet listesi', url: 'https://www.istanbuleczaciodasi.org.tr/nobetci-eczane/', evidenceUrl: 'https://www.istanbuleczaciodasi.org.tr/nobetci-eczane/'},
].map(source => Object.freeze({...source, verifiedAt:source.provinceId===77?'2026-10-09':verifiedAt})));

function normalizeCity(city: string): string {
  return city.trim().toLocaleLowerCase('tr-TR').normalize('NFKD').replace(/\p{M}/gu, '').replace(/ı/g, 'i');
}

const chambersByCity = new Map(PHARMACY_CHAMBERS.map(chamber => [normalizeCity(chamber.province), chamber]));
const dutyListsByProvince = new Map(VERIFIED_PHARMACY_DUTY_SOURCES.map(source => [source.provinceId, source]));

/** Resolve only an exact province name; shared chamber membership does not imply shared duty coverage. */
export function getPharmacySource(city?: string | null): PharmacySource {
  const chamber = chambersByCity.get(normalizeCity(city ?? ''));
  if (!chamber) {
    return {name: 'Türk Eczacıları Birliği · Eczacı odaları', url: PHARMACY_SOURCE_PROVENANCE.sourceUrl, kind: 'directory'};
  }
  const dutyList = dutyListsByProvince.get(chamber.provinceId);
  if (dutyList) return {name: dutyList.name, url: dutyList.url, kind: 'duty-list'};
  return {name: chamber.chamber, url: chamber.url, kind: 'chamber'};
}
