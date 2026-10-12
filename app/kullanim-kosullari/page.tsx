import type {Metadata} from 'next';
import {LegalPage} from '@/components/legal-page';
export const metadata:Metadata={title:'Kullanım Koşulları | Şimdi Açık',alternates:{canonical:'/kullanim-kosullari'}};
export default function Page(){return <LegalPage documentKey="kullanim-kosullari"/>;}
