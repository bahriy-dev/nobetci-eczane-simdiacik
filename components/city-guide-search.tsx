'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {MapPin, Compass} from 'lucide-react';
import {RegionPicker} from '@/components/region-picker';

export function CityGuideSearch({city}: {city: string}) {
  const router = useRouter();
  const [geoLocating, setGeoLocating] = useState(false);

  const requestGps = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      router.push('/?selectLocation=1');
      return;
    }
    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const params = new URLSearchParams({
          lat: String(Number(pos.coords.latitude.toFixed(6))),
          lng: String(Number(pos.coords.longitude.toFixed(6))),
        });
        router.push('/?' + params.toString());
      },
      () => {
        setGeoLocating(false);
        router.push('/?selectLocation=1');
      },
      {timeout: 10000, enableHighAccuracy: true}
    );
  };

  return (
    <section className="city-guide-search-card" aria-labelledby="city-guide-search-title">
      <div className="city-guide-search-header">
        <div className="city-search-badge">
          <MapPin size={14} />
          <span>İlçe & Konum Seçimi</span>
        </div>
        <h2 id="city-guide-search-title">
          {city} Nöbetçi Eczaneleri Bul
        </h2>
        <p>
          Cihazınızın konumunu kullanarak en yakındaki nöbetçi eczaneleri listeleyin veya ilçe seçerek aramayı başlatın.
        </p>
      </div>

      <div className="city-search-actions">
        <button
          type="button"
          className="city-gps-btn"
          disabled={geoLocating}
          onClick={requestGps}
          aria-label="Cihaz konumunu kullanarak en yakın eczaneleri bul"
        >
          <Compass size={18} className={geoLocating ? 'spin' : ''} />
          <span>{geoLocating ? 'Konumunuz alınıyor…' : 'Bulunduğum Konumu Kullan (GPS)'}</span>
        </button>

        <div className="city-search-divider">
          <span>veya ilçeye göre listele</span>
        </div>

        <div className="city-region-picker-wrapper">
          <RegionPicker city={city} onSelect={location => {
            const params = new URLSearchParams({
              lat: String(location.lat),
              lng: String(location.lng),
            });
            router.push('/?' + params.toString());
          }} />
        </div>
      </div>
    </section>
  );
}
