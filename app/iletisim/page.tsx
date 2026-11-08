import type {Metadata} from 'next';
import {LegalPage} from '@/components/legal-page';
import {legalDocuments} from '@/lib/legal-content';
import {siteOrigin,ogImage} from '@/lib/site-config';
const doc=legalDocuments['iletisim'];
export const metadata:Metadata={title:'İletişim',description:doc.intro,alternates:{canonical:'/iletisim'},openGraph:{images:[ogImage],title:doc.title,description:doc.intro,url:siteOrigin+'/iletisim'},twitter:{title:doc.title,description:doc.intro}};
export default function Page(){return <LegalPage documentKey="iletisim"/>;}
