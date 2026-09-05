import { getCurrentUser } from '@/actions/auth-actions';
import { readCatalog, saveLocalCatalogIdentity } from '@/lib/schematics/catalog';
import { sameDevice } from '@/lib/schematics/catalog-types';
import { saveDatabaseAssetIdentity } from '@/lib/schematics/database';
import { resolvePairings } from '@/lib/schematics/pairing-server';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
export async function GET(_request:Request,context:Context) {
  try {
    const user=await getCurrentUser();
    if(!user)return Response.json({error:'Sesión requerida'},{status:401});
    if(!['ADMIN','TECHNICIAN'].includes(user.role))return Response.json({error:'Acceso restringido'},{status:403});
    const {id}=await context.params;
    const catalog=await readCatalog(); const asset=catalog.assets.find(item=>item.id===id);
    if(!asset)return Response.json({error:'Archivo no encontrado'},{status:404});
    return Response.json(await resolvePairings(asset,catalog.assets));
  }catch(error){console.error('[ESQUEMATICOS] No se pudieron consultar vínculos',error instanceof Error?error.message:'Error');return Response.json({error:'No se pudieron consultar los documentos del equipo'},{status:503});}
}
export async function POST(request:Request,context:Context) {
  try {
    const user=await getCurrentUser();
    if(!user)return Response.json({error:'Sesión requerida'},{status:401});
    if(user.role!=='ADMIN')return Response.json({error:'Solo administración puede confirmar vínculos'},{status:403});
    const input=await request.json() as {targetId?:unknown;sourceSha256?:unknown;targetSha256?:unknown;confirmed?:unknown};
    const {id}=await context.params; const catalog=await readCatalog();
    const source=catalog.assets.find(asset=>asset.id===id),target=catalog.assets.find(asset=>asset.id===input.targetId);
    if(!source||!target)return Response.json({error:'Archivo no encontrado'},{status:404});
    if(input.confirmed!==true||source.kind===target.kind||source.status!=='ready'||target.status!=='ready'||!sameDevice(source,target))return Response.json({error:'Confirmá dos archivos del mismo modelo y sin revisiones contradictorias'},{status:400});
    if(input.sourceSha256!==source.sha256||input.targetSha256!==target.sha256)return Response.json({error:'Los archivos cambiaron. Volvé a abrirlos antes de vincular.'},{status:409});
    const asset={...source,documentLinks:[...(source.documentLinks??[]).filter(link=>link.assetId!==target.id),{assetId:target.id,sha256:target.sha256,sourceSha256:source.sha256,confirmedBy:user.id,confirmedAt:new Date().toISOString()}]};
    if(!await saveDatabaseAssetIdentity(asset,source))await saveLocalCatalogIdentity(asset,source);
    return Response.json({asset});
  }catch(error){
    if(error instanceof SyntaxError)return Response.json({error:'Datos inválidos'},{status:400});
    if(error instanceof Error&&error.message==='IDENTITY_CONFLICT')return Response.json({error:'La asociación cambió. Recargá los archivos.'},{status:409});
    console.error('[ESQUEMATICOS] No se pudo guardar el vínculo',error instanceof Error?error.message:'Error');
    return Response.json({error:'No se pudo guardar el vínculo'},{status:500});
  }
}
