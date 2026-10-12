import type {Metadata} from 'next';
import {LegalPage} from '@/components/legal-page';
export const metadata:Metadata={title:'Gizlilik Politikası | Şimdi Açık',alternates:{canonical:'/gizlilik'}};
export default function Page(){return <LegalPage documentKey="gizlilik"/>;}
