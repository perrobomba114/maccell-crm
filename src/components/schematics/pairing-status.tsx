'use client';
import {useState} from 'react';
import type {SchematicAsset} from '@/lib/schematics/catalog-types';
import {sameDevice} from '@/lib/schematics/catalog-types';
export function PairingStatus({board,pdf,linked,canEdit,onUpdated}:{board:SchematicAsset;pdf:SchematicAsset;linked:boolean;canEdit:boolean;onUpdated(asset:SchematicAsset):void}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const compatible=sameDevice(board,pdf);
 async function confirm(){
  setBusy(true);setError('');
  try{
   const response=await fetch(`/api/schematics/${board.id}/links`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({targetId:pdf.id,sourceSha256:board.sha256,targetSha256:pdf.sha256,confirmed:true})});
   const data=await response.json() as {asset?:SchematicAsset;error?:string};
   if(!response.ok||!data.asset)throw new Error(data.error??'No se pudo guardar la asociación');
   onUpdated(data.asset);
  }catch(cause){setError(cause instanceof Error?cause.message:'No se pudo guardar');}finally{setBusy(false);}
 }
 return <div className="sch-notice sch-identity-notice" role="status">
  {linked?'Placa y esquema vinculados · seleccioná una referencia para localizarla en ambos.':compatible?'Revisá que estos archivos correspondan a la misma placa y revisión antes de sincronizarlos.':'Estos archivos corresponden a equipos o revisiones diferentes.'}
  {!linked&&compatible&&canEdit&&<button disabled={busy} onClick={()=>void confirm()}>{busy?'Guardando…':'Confirmar que esta placa y este PDF corresponden'}</button>}
  {!linked&&compatible&&!canEdit&&<span> Un administrador puede confirmar esta asociación una sola vez.</span>}
  {error&&<span role="alert">{error}</span>}
 </div>;
}
