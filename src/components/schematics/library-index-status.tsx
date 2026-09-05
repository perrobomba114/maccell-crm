'use client';
import {useEffect,useState} from 'react';
import {usePolling} from '@/hooks/use-polling';
import type {SemanticIndexStatus} from '@/lib/schematics/semantic-status';
import {SemanticIndexStatusView} from './semantic-index-status';
type Summary={total:number;indexed:number;pending:number;failed:number;unsupported:number;verified:number;semantic?:SemanticIndexStatus};
export function LibraryIndexStatus({canReindex}:{canReindex:boolean}){
 const [summary,setSummary]=useState<Summary|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function refresh(signal?:AbortSignal){
  try{const response=await fetch('/api/schematics/index',{signal});if(!response.ok)throw new Error('No se pudo consultar el progreso');const data=await response.json() as Summary;if(!signal?.aborted){setSummary(data);setError('');}}
  catch(cause){if(!signal?.aborted)setError(cause instanceof Error?cause.message:'Error de índice');}
 }
 useEffect(()=>{const controller=new AbortController();void refresh(controller.signal);return()=>controller.abort();},[]);
 const semanticActive=summary?.semantic&&['processing','pending','partial'].includes(summary.semantic.status);
 usePolling(()=>refresh(),15_000,!!summary?.pending||!!semanticActive);
 async function enqueue(){setBusy(true);try{const response=await fetch('/api/schematics/index',{method:'POST'});if(!response.ok)throw new Error('No se pudieron encolar los pendientes');await refresh();}catch(cause){setError(cause instanceof Error?cause.message:'Error de índice');}finally{setBusy(false);}}
 return <details className="sch-library-index"><summary>Índice técnico {summary?`${summary.indexed}/${summary.total}`:''}</summary>
 {error&&<p role="alert">{error}</p>}{summary&&<p role="status">{summary.pending} pendientes · {summary.failed} errores · {summary.unsupported} no compatibles. {summary.verified} identidades validadas.</p>}
 {summary?.semantic&&<SemanticIndexStatusView status={summary.semantic} showConfiguration={canReindex}/>}
 <button onClick={()=>void refresh()}>Actualizar progreso</button>{canReindex&&<button disabled={busy} onClick={()=>void enqueue()}>{busy?'Encolando…':'Indexar pendientes / reintentar'}</button>}
 </details>;
}
