'use client';

import {useEffect, useRef, useState} from 'react';
import {normalized} from '@/lib/places';
import type {ProvinceDTO, DistrictDTO, RegionsResult} from '@/lib/regions';

type Location = {label: string; city: string; lat: number; lng: number};

export function RegionPicker({city, onSelect}: {city: string; onSelect: (location: Location) => void}) {
  const [provinces, setProvinces] = useState<ProvinceDTO[]>([]);
  const [districts, setDistricts] = useState<DistrictDTO[]>([]);
  const [provinceId, setProvinceId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [loading, setLoading] = useState(true);
  const [districtLoading, setDistrictLoading] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState('');
  const [errorStage, setErrorStage] = useState<'provinces' | 'districts' | 'location'>('provinces');
  const [retry, setRetry] = useState(0);
  const syncedCity = useRef('');
  const selectionRequest = useRef<AbortController | null>(null);

  useEffect(() => () => selectionRequest.current?.abort(), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetch('/api/regions', {signal: controller.signal}).then(async response => {
      const result = await response.json() as RegionsResult & {error?: string};
      if (!response.ok || result.kind !== 'provinces') throw new Error(result.error || 'İl listesi alınamadı.');
      const rows = result.regions as ProvinceDTO[];
      setProvinces(rows);
      if (syncedCity.current !== city) {
        setProvinceId(String(rows.find(p => normalized(p.name) === normalized(city))?.id || ''));
        syncedCity.current = city;
      }
    }).catch(e => {
      if (e.name !== 'AbortError') {setError(e.message); setErrorStage('provinces');}
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [city, retry]);

  useEffect(() => {
    setDistricts([]);
    setDistrictId('');
    if (!provinceId) return;
    const controller = new AbortController();
    setDistrictLoading(true);
    setError('');
    fetch('/api/regions?provinceId=' + provinceId, {signal: controller.signal}).then(async response => {
      const result = await response.json() as RegionsResult & {error?: string};
      if (!response.ok || result.kind !== 'districts') throw new Error(result.error || 'İlçe listesi alınamadı.');
      setDistricts(result.regions as DistrictDTO[]);
    }).catch(e => {
      if (e.name !== 'AbortError') {setError(e.message); setErrorStage('districts');}
    }).finally(() => {
      if (!controller.signal.aborted) setDistrictLoading(false);
    });
    return () => controller.abort();
  }, [provinceId, retry]);

  const select = async () => {
    const province = provinces.find(p => String(p.id) === provinceId);
    if (!province) return;
    const district = districts.find(d => String(d.id) === districtId);
    selectionRequest.current?.abort();
    const controller = new AbortController();
    selectionRequest.current = controller;
    setSelecting(true);
    setError('');
    try {
      if (!district || normalized(district.name) === 'merkez') {
        onSelect({label: district ? district.name + ', ' + province.name : province.name + ' · İl merkezi', city: province.name, lat: province.lat, lng: province.lng});
        return;
      }
      // Districts have no coordinates in TürkiyeAPI; resolve only on a user click.
      const q = district.name + ', ' + province.name;
      const response = await fetch('/api/location?q=' + encodeURIComponent(q), {signal: controller.signal});
      const result = await response.json() as Location[] & {error?: string};
      if (!response.ok) throw new Error(result.error || 'İlçe konumu alınamadı.');
      const match = result.find(p => normalized(p.city) === normalized(province.name)
        && normalized(p.label.split(',')[0].trim()) === normalized(district.name));
      if (!match) throw new Error('İlçe merkezi bulunamadı. Mahalle veya adres aramasını kullanabilirsin.');
      if (controller.signal.aborted) return;
      onSelect({...match, label: district.name + ', ' + province.name, city: province.name});
    } catch (e) {
      if (!controller.signal.aborted) {setError((e as Error).message); setErrorStage('location');}
    } finally {
      if (!controller.signal.aborted) setSelecting(false);
    }
  };

  return <div className="region-picker">
    <div className="region-selects">
      <label>İl<select aria-label="İl seç" value={provinceId} disabled={loading || selecting} onChange={e => setProvinceId(e.target.value)}>
        <option value="">{loading ? 'İller yükleniyor…' : 'İl seç'}</option>
        {provinces.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}
      </select></label>
      <label>İlçe<select aria-label="İlçe seç" value={districtId} disabled={!provinceId || districtLoading || selecting} onChange={e => setDistrictId(e.target.value)}>
        <option value="">{districtLoading ? 'İlçeler yükleniyor…' : 'İl merkezi'}</option>
        {districts.map(d => <option value={d.id} key={d.id}>{d.name}</option>)}
      </select></label>
    </div>
    <button className="primary" disabled={!provinceId || loading || selecting || districtLoading} onClick={() => void select()}>{selecting ? 'Konum bulunuyor…' : 'Bu bölgeyi kullan'}</button>
    {error && <div className="region-error" role="alert"><p>{error}</p><button onClick={() => errorStage === 'location' ? void select() : setRetry(r => r + 1)}>Tekrar dene</button></div>}

  </div>;
}
