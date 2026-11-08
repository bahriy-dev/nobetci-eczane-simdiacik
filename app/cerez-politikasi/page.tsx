import type {Metadata} from 'next';
import {LegalPage} from '@/components/legal-page';
import {legalDocuments} from '@/lib/legal-content';
import {siteOrigin,ogImage} from '@/lib/site-config';
const doc=legalDocuments['cerez-politikasi'];
export const metadata:Metadata={title:'Çerez Politikası',description:doc.intro,alternates:{canonical:'/cerez-politikasi'},openGraph:{images:[ogImage],title:doc.title,description:doc.intro,url:siteOrigin+'/cerez-politikasi'},twitter:{title:doc.title,description:doc.intro}};
export default function Page(){return <LegalPage documentKey="cerez-politikasi"/>;}
