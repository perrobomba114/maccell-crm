import {readFile,realpath,stat} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import type {SchematicAsset} from './catalog-types';
import {parsePcbe} from './pcbe';
type Profile={components:string[];nets:string[]};
const cache=new Map<string,Promise<Profile>>();
export async function boardReferenceProfile(asset:SchematicAsset,root:string):Promise<Profile>{
 const resolvedRoot=await realpath(root),file=await realpath(path.join(resolvedRoot,asset.relativePath));
 if(!file.startsWith(resolvedRoot+path.sep))throw new Error('Placa fuera de la biblioteca');
 const facts=await stat(file),key=`${file}:${asset.sha256}:${facts.size}:${facts.mtimeMs}`;
 const previous=cache.get(key);if(previous)return previous;
 if(cache.size>=32)cache.delete(cache.keys().next().value!);
 const pending=(async()=>{const bytes=await readFile(file);if(createHash('sha256').update(bytes).digest('hex')!==asset.sha256)throw new Error('Placa cambió respecto del catálogo');const board=parsePcbe(bytes,asset.name);return {components:board.components.map(c=>c.name),nets:board.netCatalog.map(n=>n.name)};})();
 cache.set(key,pending);
 try{return await pending;}catch(error){cache.delete(key);throw error;}
}
