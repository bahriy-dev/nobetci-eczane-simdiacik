import type {Metadata} from 'next';
import {LegalPage} from '@/components/legal-page';
export const metadata:Metadata={title:'İletişim | Şimdi Açık',alternates:{canonical:'/iletisim'}};
export default function Page(){return <LegalPage documentKey="iletisim"/>;}
