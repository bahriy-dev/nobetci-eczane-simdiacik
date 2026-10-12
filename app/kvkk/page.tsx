import type {Metadata} from 'next';
import {LegalPage} from '@/components/legal-page';
export const metadata:Metadata={title:'KVKK Aydınlatma Metni | Şimdi Açık',alternates:{canonical:'/kvkk'}};
export default function Page(){return <LegalPage documentKey="kvkk"/>;}
