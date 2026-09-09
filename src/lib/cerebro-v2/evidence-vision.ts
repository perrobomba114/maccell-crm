import { createReadStream } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, rm, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { generateText, Output } from 'ai';
import { buildModel } from './provider-selection';
import { requestRagPageImage } from './worker-client';
import { formatVisibleSchematicFacts, parseVisibleSchematicFacts, VISION_FACTS_SYSTEM_PROMPT } from './vision-analysis';
import type { CerebroSource } from './types';

const run=promisify(execFile);
export async function requestEvidencePage(source:CerebroSource):Promise<Uint8Array> {
    if (!source.workbenchUrl) return requestRagPageImage(source.documentId,source.pageNumber??1);
    const {resolveAsset}=await import('@/lib/schematics/catalog');
    const resolved=await resolveAsset(source.documentId);
    if (!resolved || resolved.asset.kind!=='pdf' || resolved.asset.status!=='ready') throw new Error('PDF no disponible');
    const temporary=await mkdtemp(path.join(tmpdir(),'cerebro-page-'));
    try {
        const snapshot=path.join(temporary,'source.pdf');
        await copyFile(resolved.file,snapshot);
        const hash=createHash('sha256');
        for await (const chunk of createReadStream(snapshot)) hash.update(chunk);
        if (hash.digest('hex')!==resolved.asset.sha256) throw new Error('El PDF cambió');
        const page=source.pageNumber??1;
        if (!Number.isSafeInteger(page)||page<1) throw new Error('Página inválida');
        await run('pdftoppm',['-f',String(page),'-l',String(page),'-singlefile','-scale-to','2200','-png',snapshot,path.join(temporary,'page')],{timeout:12_000,maxBuffer:1024*1024});
        return new Uint8Array(await readFile(path.join(temporary,'page.png')));
    } finally {await rm(temporary,{recursive:true,force:true});}
}

async function describe(image:string|Uint8Array):Promise<string> {
    const result=await generateText({model:buildModel(()=>undefined,true,true),system:VISION_FACTS_SYSTEM_PROMPT,
        messages:[{role:'user',content:[{type:'text',text:'Leé únicamente hechos visibles, sin inferir conexiones ni pines ilegibles.'},{type:'image',image}]}],
        output:Output.json(),providerOptions:{openrouter:{reasoning:{enabled:false}}},
        temperature:0,maxOutputTokens:600,maxRetries:0,abortSignal:AbortSignal.timeout(35_000)});
    const facts=parseVisibleSchematicFacts(result.text);
    if (!facts) throw new Error('Lectura visual no interpretable');
    return formatVisibleSchematicFacts(facts);
}

export async function loadEvidenceVision(sources:readonly CerebroSource[],images:readonly string[], dependencies = { describe, requestPage: requestEvidencePage }):Promise<{facts:string;warnings:string[]}> {
    const candidates=sources.map((source,i)=>({source,label:`E${i+1}`}))
        .filter(({source})=>source.sourceType==='PDF' && source.pageNumber!==null
            && /esquema|schematic|plano|troubleshoot|repair case|fault/i.test(source.title.normalize("NFD").replace(/[\u0300-\u036f]/g,""))).slice(0,Math.max(0,2-images.length));
    const tasks=[...images.slice(0,2).map((image,i)=>({label:`Imagen adjunta ${i+1} (no es medición confirmada)`,read:()=>dependencies.describe(image)})),
        ...candidates.map(({source,label})=>({label:`${label}, ${source.title}, página ${source.pageNumber}`,read:async()=>dependencies.describe(await dependencies.requestPage(source))}))];
    const results=await Promise.allSettled(tasks.map(async task=>`${task.label}:\n${await task.read()}`));
    return {facts:results.flatMap(r=>r.status==='fulfilled'?[r.value]:[]).join('\n\n'),
        warnings:[...(images.length>2?['Se analizaron las primeras dos imágenes; enviá las restantes en otra consulta']:[]),...results.flatMap((r,i)=>r.status==='rejected'?[`No se pudo verificar visualmente ${tasks[i].label}`]:[])]};
}
