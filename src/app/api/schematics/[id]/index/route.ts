import { getCurrentUser } from '@/actions/auth-actions';
import { readCatalog } from '@/lib/schematics/catalog';
import { readTechnicalIndex, indexJob, enqueueTechnicalIndex, hasPreviousTechnicalIndex } from '@/lib/schematics/index-store';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({error:'Sesión requerida'},{status:401});
    if (!['ADMIN','TECHNICIAN'].includes(user.role)) return Response.json({error:'Acceso restringido'},{status:403});
    const id = (await context.params).id;
    const asset = (await readCatalog()).assets.find(item=>item.id===id);
    if (!asset) return Response.json({error:'Archivo no encontrado'},{status:404});
    const [index,job] = await Promise.all([readTechnicalIndex(asset),indexJob(asset)]);
    const stale = !index && await hasPreviousTechnicalIndex(asset.id);
    const requestedPage = Number(new URL(request.url).searchParams.get('page'));
    if(new URL(request.url).searchParams.get('references')==='all'){
      const referencePages=index?.pages.map(({page,text,boxes})=>({page,text,boxes}));
      const bounded=referencePages&&JSON.stringify(referencePages).length<=12_000_000;
      return Response.json({status:index?(index.complete===false?'partial':'indexed'):'not_indexed',referencePages:bounded?referencePages:undefined});
    }
    return Response.json({status:index?(index.complete===false?'partial':'indexed'):job?.status === 'failed'?'failed':stale?'stale':job?.status ?? 'not_indexed',jobStatus:job?.status,error:job?.error ? 'No se pudo indexar este archivo. Reintentá desde el índice.' : undefined,pages:index?.pages.length??0,components:index?.components.length??0,nets:index?.nets.length??0,page:index?.pages.find(page=>page.page===requestedPage),identityVerified:!!asset.identityVerified});
  } catch (error) {
    console.error('[ESQUEMATICOS] No se pudo consultar el índice',error instanceof Error?error.message:'Error');
    return Response.json({error:'Índice no disponible'},{status:503});
  }
}
export async function POST(_request: Request, context: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({error:'Sesión requerida'},{status:401});
    if (user.role!=='ADMIN') return Response.json({error:'Solo un administrador puede reindexar'},{status:403});
    const id = (await context.params).id;
    const asset = (await readCatalog()).assets.find(item=>item.id===id);
    if (!asset) return Response.json({error:'Archivo no encontrado'},{status:404});
    if (asset.status!=='ready') return Response.json({error:'El archivo está protegido o su formato no es compatible'},{status:422});
    await enqueueTechnicalIndex(asset);
    return Response.json({status:'pending'},{status:202});
  } catch(error) {
    console.error('[ESQUEMATICOS] No se pudo encolar índice',error instanceof Error?error.message:'Error');
    return Response.json({error:'No se pudo programar la indexación'},{status:503});
  }
}
