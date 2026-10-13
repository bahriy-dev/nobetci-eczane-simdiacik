export type SourceFailureKind='timeout'|'tls'|'rate-limited'|'upstream'|'network'|'invalid-response';
export class SourceFailure extends Error{
 constructor(public kind:SourceFailureKind,public status?:number,public retryAfter?:number){super('Güncel nöbet kaynağı doğrulanamadı.');this.name='SourceFailure';}
}
export function classifySourceFailure(error:unknown):SourceFailure{
 if(error instanceof SourceFailure)return error;
 const e=error as {name?:string;code?:string;cause?:{code?:string}};
 const code=e?.cause?.code||e?.code||'';
 if(/CERT|TLS|SSL|VERIFY|ISSUER/.test(code))return new SourceFailure('tls');
 if(['TimeoutError','AbortError'].includes(e?.name||'')||/TIMEOUT/.test(code))return new SourceFailure('timeout');
 if(error instanceof TypeError||/ENOTFOUND|ECONN|EAI_AGAIN/.test(code))return new SourceFailure('network');
 return new SourceFailure('invalid-response');
}
export async function requestSource(url:string|URL,init?:RequestInit):Promise<Response>{
 // Only the fixed official URLs in provider adapters reach this helper. TLS defaults stay enabled.
 try{
  const response=await fetch(url,{...init,cache:'no-store',signal:AbortSignal.timeout(12000)});
  if(!response.ok){const retry=Number(response.headers.get('Retry-After'));throw new SourceFailure(response.status===429?'rate-limited':'upstream',response.status,Number.isFinite(retry)&&retry>0?Math.min(retry,60):undefined);}
  return response;
 }catch(error){throw classifySourceFailure(error);}
}
