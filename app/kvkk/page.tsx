import type {Metadata} from 'next';
import {LegalPage} from '@/components/legal-page';
import {legalDocuments} from '@/lib/legal-content';
import {siteOrigin,ogImage} from '@/lib/site-config';
const doc=legalDocuments['kvkk'];
export const metadata:Metadata={title:'KVKK Aydınlatma Metni',description:doc.intro,alternates:{canonical:'/kvkk'},openGraph:{images:[ogImage],title:doc.title,description:doc.intro,url:siteOrigin+'/kvkk'},twitter:{title:doc.title,description:doc.intro},robots:{index:false,follow:true}};
export default function Page(){return <LegalPage documentKey="kvkk"/>;}
