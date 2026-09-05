import test from 'node:test';
import assert from 'node:assert/strict';
import { libraryIndexIssues, type LibraryIndexIssueRow } from '../../lib/schematics/library-index-issues';
const row: LibraryIndexIssueRow = {id:'a'.repeat(64),name:'iPhone_13.pcbe',kind:'pcbe',catalogStatus:'unsupported',catalogDetail:'Este formato todavía no contiene geometría decodificable por el visor.',jobStatus:null};

test('unsupported assets expose their name and a review link with an approved catalog reason', () => {
  const [issue] = libraryIndexIssues([row]);
  assert.equal(issue.name,'iPhone_13.pcbe');
  assert.equal(issue.status,'unsupported');
  assert.equal(issue.reason,'Este formato todavía no contiene geometría decodificable por el visor.');
  assert.equal(issue.href,`/technician/schematics?board=${'a'.repeat(64)}&page=1`);
  const [locked] = libraryIndexIssues([{...row,kind:'pdf',catalogStatus:'locked',catalogDetail:null}]);
  assert.equal(locked.reason,'El PDF requiere contraseña para abrirse e indexarse.');
  assert.equal(locked.href,`/technician/schematics?pdf=${'a'.repeat(64)}&page=1`);
});

test('raw database errors, provider credentials and filesystem paths never enter the response', () => {
  const dangerous = {...row, name:'/app/upload/private/board.pcbe',catalogStatus:'ready',jobStatus:'failed',catalogDetail:'postgres://admin:SUPERSECRET@private-db/internal',error:'password=SUPERSECRET',relativePath:'/app/upload/private/board.pcbe'};
  const [issue] = libraryIndexIssues([dangerous]);
  assert.equal(issue.name,'board.pcbe');
  assert.equal(issue.status,'failed');
  const serialized=JSON.stringify(issue);
  for(const secret of ['SUPERSECRET','postgres:','private-db','/app/','relativePath','password=','"error"']) assert.equal(serialized.includes(secret),false);
  assert.match(issue.reason,/No se pudo completar/);
  assert.equal(libraryIndexIssues([{...row,name:'postgres://user:SUPERSECRET@host/file.pcbe'}])[0].name,'Archivo sin nombre');
});

test('issue list is bounded and prioritizes unsupported files before a large failed queue', () => {
  const failed = Array.from({length:25},(_,index)=>({...row,id:index.toString(16).padStart(64,'0'),catalogStatus:'ready',jobStatus:'failed'}));
  const issues=libraryIndexIssues([...failed,row]);
  assert.equal(issues.length,20);
  assert.equal(issues[0].id,row.id);
  assert.equal(libraryIndexIssues([{...row,catalogStatus:'ready',jobStatus:'indexed'}]).length,0);
  assert.equal(libraryIndexIssues([{...row,id:'../../private'}]).length,0);
});
