import type { SchematicCatalog } from './catalog-types';

/** Share concurrent catalog reads; a physical snapshot change invalidates immediately. */
export class CatalogCache {
  private entry?: {key:string;expires:number;value:Promise<SchematicCatalog>};
  constructor(private readonly now:()=>number=Date.now,private readonly ttl=5_000) {}
  read(key:string,load:()=>Promise<SchematicCatalog>):Promise<SchematicCatalog> {
    if(this.entry?.key===key && this.entry.expires>this.now())return this.entry.value;
    const entry={key,expires:Infinity,value:Promise.resolve().then(load)};
    this.entry=entry;
    void entry.value.then(()=>{entry.expires=this.now()+this.ttl;},()=>{if(this.entry===entry)this.entry=undefined;});
    return entry.value;
  }
  invalidate(){this.entry=undefined;}
}
const state=globalThis as typeof globalThis & {schematicCatalogCache?:CatalogCache};
export const schematicCatalogCache=state.schematicCatalogCache ??= new CatalogCache();
