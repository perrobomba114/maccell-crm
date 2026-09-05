import {getCurrentUser} from '@/actions/auth-actions';
import {db} from '@/lib/db';
import {readLibrarySemanticStatus} from '@/lib/schematics/semantic-status-server';
export const dynamic='force-dynamic';
export async function GET() {
  try {
    const user=await getCurrentUser();
    if(!user)return Response.json({error:'Sesión requerida'},{status:401});
    if(!['ADMIN','TECHNICIAN'].includes(user.role))return Response.json({error:'Acceso restringido'},{status:403});
    const rows=await db.$queryRaw<{total:number;indexed:number;pending:number;failed:number;unsupported:number;verified:number}[]>`
      SELECT count(*)::integer AS total,
      count(*) FILTER(WHERE i.index_version=1 AND i.asset_sha256=a.sha256)::integer AS indexed,
      count(*) FILTER(WHERE a.metadata->>'status'='ready' AND (j.status IN ('pending','processing') OR i.asset_id IS NULL OR i.asset_sha256<>a.sha256 OR i.index_version<>1) AND COALESCE(j.status,'pending')<>'failed')::integer AS pending,
      count(*) FILTER(WHERE j.status='failed')::integer AS failed,
      count(*) FILTER(WHERE a.metadata->>'status'<>'ready')::integer AS unsupported,
      count(*) FILTER(WHERE a.metadata->>'identityVerified'='true')::integer AS verified
      FROM schematics.assets a LEFT JOIN schematics.technical_indexes i ON i.asset_id=a.id LEFT JOIN schematics.index_jobs j ON j.asset_id=a.id`;
    const semantic=await readLibrarySemanticStatus();
    return Response.json({...rows[0],semantic});
  }catch(error){
    console.error('[ESQUEMATICOS] Estado global del índice no disponible',error instanceof Error?error.message:'Error');
    return Response.json({error:'El estado de indexación no está disponible'},{status:503});
  }
}
export async function POST() {
  try {
    const user=await getCurrentUser();
    if(!user)return Response.json({error:'Sesión requerida'},{status:401});
    if(user.role!=='ADMIN')return Response.json({error:'Solo un administrador puede reindexar'},{status:403});
    const queued=await db.$executeRaw`INSERT INTO schematics.index_jobs(asset_id,asset_sha256,status)
      SELECT a.id,a.sha256,'pending' FROM schematics.assets a LEFT JOIN schematics.technical_indexes i ON i.asset_id=a.id LEFT JOIN schematics.index_jobs j ON j.asset_id=a.id
      WHERE a.metadata->>'status'='ready' AND (i.asset_id IS NULL OR i.index_version<>1 OR i.asset_sha256<>a.sha256 OR j.status='failed')
      ON CONFLICT(asset_id) DO UPDATE SET status='pending',error=NULL,asset_sha256=excluded.asset_sha256,updated_at=now() WHERE schematics.index_jobs.status<>'processing'`;
    return Response.json({queued},{status:202});
  }catch(error){
    console.error('[ESQUEMATICOS] No se pudo encolar la biblioteca',error instanceof Error?error.message:'Error');
    return Response.json({error:'No se pudo programar la indexación'},{status:503});
  }
}
