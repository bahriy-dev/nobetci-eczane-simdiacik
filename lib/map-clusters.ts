export type ScreenPoint={x:number;y:number};
/** Join nearby screen points across grid boundaries so marker hit areas do not overlap. */
export function clusterMapPoints<T extends ScreenPoint>(points:T[],distance=46):T[][]{
 const parents=points.map((_,i)=>i);
 const find=(i:number):number=>parents[i]===i?i:(parents[i]=find(parents[i]));
 for(let i=0;i<points.length;i++)for(let j=0;j<i;j++){
  if(Math.hypot(points[i].x-points[j].x,points[i].y-points[j].y)<distance)parents[find(i)]=find(j);
 }
 const groups=new Map<number,T[]>();points.forEach((p,i)=>{const root=find(i),group=groups.get(root)||[];group.push(p);groups.set(root,group);});return [...groups.values()];
}
