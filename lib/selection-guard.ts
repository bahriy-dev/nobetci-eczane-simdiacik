/** A newer manual/GPS/map selection invalidates every earlier asynchronous result. */
export class SelectionGuard{private version=0;begin(){return ++this.version;}isCurrent(attempt:number){return attempt===this.version;}invalidate(){this.version++;}}
