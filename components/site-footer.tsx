"use client";
import Link from "next/link";
import { Plus, ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { legalLinks } from "@/lib/legal-content";
type Props = { sourceUrl?: string; onDiscover?: () => void; onMap?: () => void; onLocation?: () => void; onHelp?: () => void };
export function SiteFooter({sourceUrl = "https://teb.org.tr/odalar", onDiscover, onMap, onLocation, onHelp}: Props) {
 const router = useRouter();
 return <footer className="site-footer">
  <div className="signal-footer-top">
   <div><Link className="brand" href="/" aria-label="Şimdi Açık ana sayfa"><span className="brand-icon"><Plus size={24} strokeWidth={3}/></span><span className="brand-name">şimdi<span>açık</span><small>NÖBETÇİ ECZANE</small></span></Link><p>İhtiyacın olduğunda, yakınındaki eczaneye.</p></div>
   <nav className="signal-footer-nav" aria-label="Eczane ve yardım">
    <button type="button" onClick={() => onDiscover ? onDiscover() : router.push("/#eczaneler")}>Eczane bul</button>
    <button type="button" onClick={() => onMap ? onMap() : router.push("/?view=map")}>Harita</button>
    <button type="button" onClick={() => onLocation ? onLocation() : router.push("/?selectLocation=1")}>Şehir seç</button>
    <button type="button" onClick={() => onHelp ? onHelp() : router.push("/nobetci-eczane-rehberi")}>Nasıl çalışır?</button>
    <a href={sourceUrl} target="_blank" rel="noreferrer">Resmî kaynak <ArrowUpRight size={13}/></a>
   </nav>
  </div>
  <div className="signal-footer-bottom">
   <span>Gitmeden önce telefonla teyit et. Acil durumlarda 112.</span>
   <nav aria-label="Yasal bilgiler">{legalLinks.map(link => <Link key={link.href} href={link.href}>{link.label}</Link>)}</nav>
   <a href="mailto:info@simdiacik.com">info@simdiacik.com</a>
  </div>
 </footer>;
}
