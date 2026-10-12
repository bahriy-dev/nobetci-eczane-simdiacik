import type {Metadata} from 'next';
import {LegalPage} from '@/components/legal-page';
import {legalDocuments} from '@/lib/legal-content';
import {siteOrigin} from '@/lib/site-config';
const doc=legalDocuments['gizlilik'];
export const metadata:Metadata={title:'Gizlilik Politikası',description:doc.intro,alternates:{canonical:'/gizlilik'},openGraph:{title:doc.title,description:doc.intro,url:siteOrigin+'/gizlilik'},twitter:{title:doc.title,description:doc.intro}};
export default function Page(){return <LegalPage documentKey="gizlilik"/>;}
