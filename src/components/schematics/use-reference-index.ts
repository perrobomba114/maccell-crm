'use client';
import {useEffect,useState} from 'react';
import {buildReferenceLookup,type ReferencePage} from '@/lib/schematics/reference-cache';
export function useReferenceIndex(id:string,revision:number){
 const [result,setResult]=useState<{key:string;lookup:ReturnType<typeof buildReferenceLookup>;complete:boolean}|null>(null);
 const key=`${id}:${revision}`;
 useEffect(()=>{
  const controller=new AbortController();
  void fetch(`/api/schematics/${id}/index?references=all`,{signal:controller.signal}).then(async response=>{
   if(!response.ok)return;
   const data=await response.json() as {referencePages?:ReferencePage[];status:string};
   if(!controller.signal.aborted&&data.referencePages)setResult({key,lookup:buildReferenceLookup(data.referencePages),complete:data.status==='indexed'});
  }).catch((cause:unknown)=>{if(!controller.signal.aborted)console.warn('[PDF] Precarga de referencias no disponible',cause instanceof Error?cause.message:'Error');});
  return ()=>controller.abort();
 },[id,revision,key]);
 return result?.key===key?result:null;
}
