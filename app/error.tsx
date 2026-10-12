'use client';
export default function ErrorBoundary({reset}:{error:Error&{digest?:string};reset:()=>void}){return <main className="legal-main"><div className="legal-title"><h1>Sayfayı yeniden açalım.</h1><p>Beklenmedik bir sorun oluştu. Yeniden deneyebilir veya ana sayfaya dönebilirsin.</p></div><button className="primary" onClick={reset}>Yeniden dene</button></main>;}
