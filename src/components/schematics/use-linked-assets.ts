"use client";
import { useEffect, useState } from 'react';
import type { SchematicAsset } from '@/lib/schematics/catalog-types';

type Result={id?:string;candidates:SchematicAsset[];verifiedIds:string[];error:string;loading:boolean};
const empty:Result={candidates:[],verifiedIds:[],error:'',loading:false};
export function useLinkedAssets(anchor:SchematicAsset|null,onUnique:(asset:SchematicAsset)=>void){
 const [result,setResult]=useState<Result>(empty);
 useEffect(()=>{
  if(!anchor)return;
  const controller=new AbortController();
  setResult({...empty,id:anchor.id,loading:true});
  void fetch(`/api/schematics/${anchor.id}/links`,{signal:controller.signal}).then(async response=>{
   if(!response.ok)throw new Error('No se pudieron consultar los documentos compatibles.');
   const data=await response.json() as {assets:SchematicAsset[];verifiedIds:string[];recommendedId:string|null};
   if(controller.signal.aborted)return;
   setResult({id:anchor.id,candidates:data.assets,verifiedIds:data.verifiedIds,error:'',loading:false});
   const recommended=data.assets.find(asset=>asset.id===data.recommendedId);
   if(recommended)onUnique(recommended);
  }).catch((cause:unknown)=>{if(!controller.signal.aborted)setResult({...empty,id:anchor.id,error:cause instanceof Error?cause.message:'Error al vincular archivos'});});
  return ()=>controller.abort();
 },[anchor,onUnique]);
 return result.id===anchor?.id?result:empty;
}
