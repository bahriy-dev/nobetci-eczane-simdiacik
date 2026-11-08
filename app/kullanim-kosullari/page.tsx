import type {Metadata} from 'next';
import {LegalPage} from '@/components/legal-page';
import {legalDocuments} from '@/lib/legal-content';
import {siteOrigin,ogImage} from '@/lib/site-config';
const doc=legalDocuments['kullanim-kosullari'];
export const metadata:Metadata={title:'Kullanım Koşulları',description:doc.intro,alternates:{canonical:'/kullanim-kosullari'},openGraph:{images:[ogImage],title:doc.title,description:doc.intro,url:siteOrigin+'/kullanim-kosullari'},twitter:{title:doc.title,description:doc.intro}};
export default function Page(){return <LegalPage documentKey="kullanim-kosullari"/>;}
