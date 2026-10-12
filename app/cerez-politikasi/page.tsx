import type {Metadata} from 'next';
import {LegalPage} from '@/components/legal-page';
export const metadata:Metadata={title:'Çerez Politikası | Şimdi Açık',alternates:{canonical:'/cerez-politikasi'}};
export default function Page(){return <LegalPage documentKey="cerez-politikasi"/>;}
