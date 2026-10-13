export type SharedCoordinates={lat:number;lng:number};

export function parseSharedCoordinates(search:string):SharedCoordinates|null{
  try{
    const params=new URLSearchParams(search.startsWith('?')?search.slice(1):search);
    const lat=Number(params.get('lat')),lng=Number(params.get('lng'));
    if(!params.has('lat')||!params.has('lng')||!Number.isFinite(lat)||!Number.isFinite(lng)||lat<35||lat>43||lng<25||lng>45)return null;
    return {lat,lng};
  }catch{return null;}
}
