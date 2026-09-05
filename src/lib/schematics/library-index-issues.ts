import { workspaceLink } from './workspace';
export type LibraryIndexIssueRow = {
  id: string; name: string | null; kind: string;
  catalogStatus: string | null; catalogDetail: string | null; jobStatus: string | null;
};
export type LibraryIndexIssue = { id: string; name: string; status: 'failed' | 'unsupported'; reason: string; href: string };
const safeReasons = new Set([
  'Este formato todavía no contiene geometría decodificable por el visor.',
  'El PDF requiere contraseña para abrirse e indexarse.',
  'No se pudo interpretar el contenido del archivo.',
]);
function safeName(value: string | null): string {
  if (!value || /:\/\/|(?:password|secret|token)\s*[=:]/i.test(value)) return 'Archivo sin nombre';
  const basename = value.replace(/\\/g,'/').split('/').pop() ?? '';
  return basename.replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,180) || 'Archivo sin nombre';
}
/** Only curated catalog reasons are public; raw job errors are never accepted into this DTO. */
export function libraryIndexIssues(rows: readonly LibraryIndexIssueRow[]): LibraryIndexIssue[] {
  return rows.filter(row => /^[a-f0-9]{64}$/.test(row.id) && ['pdf','pcbe'].includes(row.kind)
    && (row.jobStatus === 'failed' || (row.catalogStatus !== null && row.catalogStatus !== 'ready')))
    .sort((left,right) => Number(right.catalogStatus !== 'ready') - Number(left.catalogStatus !== 'ready'))
    .slice(0,20).map(row => {
      const status = row.catalogStatus !== null && row.catalogStatus !== 'ready' ? 'unsupported' : 'failed';
      const catalogReason = row.catalogDetail?.trim();
      const reason = row.catalogStatus === 'locked' ? 'El PDF requiere contraseña para abrirse e indexarse.'
        : catalogReason && safeReasons.has(catalogReason) ? catalogReason
          : status === 'failed' ? 'No se pudo completar la indexación. Reintentá o revisá el archivo original.'
            : 'El contenido del archivo todavía no es compatible con el visor.';
      return {id:row.id,name:safeName(row.name),status,reason,href:workspaceLink({[row.kind === 'pdf' ? 'pdf' : 'board']:row.id,page:1})};
    });
}
