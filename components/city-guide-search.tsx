'use client';

import {useRouter} from 'next/navigation';
import {MapPin} from 'lucide-react';
import {RegionPicker} from '@/components/region-picker';

export function CityGuideSearch({city}: {city: string}) {
  const router = useRouter();
  return <section className="city-guide-search" aria-labelledby="city-guide-search-title">
    <div className="city-guide-search-heading"><span><MapPin size={20}/></span><div><h2 id="city-guide-search-title">Bölgeni seç</h2><p>Yakınındaki nöbetçi eczaneleri görmek için ilçe seç.</p></div></div>
    <RegionPicker city={city} onSelect={location => {
      const params = new URLSearchParams({lat: String(location.lat), lng: String(location.lng)});
      router.push('/?' + params.toString());
    }}/>
  </section>;
}
