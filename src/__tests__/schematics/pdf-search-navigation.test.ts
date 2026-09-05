import test from 'node:test';
import assert from 'node:assert/strict';
import { PdfSearchNavigation, pdfSearchRequest, pdfSearchContext } from '../../lib/schematics/pdf-search-navigation';

test('late preload cancels HTTP without consuming the pending component jump', () => {
  const navigation = new PdfSearchNavigation();
  const request = pdfSearchRequest('pdf', 'U7000', 1, null);
  const http = navigation.begin(request);
  navigation.cancel(http);
  const preload = navigation.begin(request);
  assert.equal(navigation.isCurrent(http), false);
  assert.equal(navigation.accept(http, true), false);
  assert.equal(navigation.accept(preload, true), true);
  const refresh = navigation.begin(request);
  assert.equal(navigation.accept(refresh, true), false);
});

test('empty or failed lookup does not consume a jump that later indexed results can fulfill', () => {
  const navigation = new PdfSearchNavigation();
  const request = pdfSearchRequest('pdf', 'U7000', 4, null);
  assert.equal(navigation.accept(navigation.begin(request), false), false);
  assert.equal(navigation.accept(navigation.begin(request), true), true);
});

test('new board navigation immediately supersedes the previous manual term without a reset render', () => {
  const manual = { context: pdfSearchContext('pdf', 'U1', 1), term: 'OLD_QUERY', sequence: 1 };
  assert.equal(pdfSearchRequest('pdf','U1',1,manual).term, 'OLD_QUERY');
  assert.equal(pdfSearchRequest('pdf','U2',2,manual).term, 'U2');
  assert.equal(pdfSearchRequest('pdf','U2',1,manual).term, 'U2');
  assert.equal(pdfSearchRequest('other','U1',1,manual).term, 'U1');
});

test('repeated manual submits navigate again without changing document/index revision', () => {
  const navigation = new PdfSearchNavigation();
  const context = pdfSearchContext('pdf','U1',1);
  const first = pdfSearchRequest('pdf','U1',1,{context,term:'C1200',sequence:1});
  const repeated = pdfSearchRequest('pdf','U1',1,{context,term:'C1200',sequence:2});
  assert.equal(navigation.accept(navigation.begin(first),true), true);
  assert.equal(navigation.accept(navigation.begin(repeated),true), true);
  assert.notEqual(first.key,repeated.key);
});

test('PDF to board echo preserves the selected occurrence, while returning to that reference navigates', () => {
  const navigation = new PdfSearchNavigation();
  navigation.preservePdfSelection('U7000',3);
  const echo = pdfSearchRequest('pdf','U7000',4,null);
  assert.equal(navigation.accept(navigation.begin(echo),true), false);
  assert.equal(navigation.accept(navigation.begin(echo),true), false);
  const returnFromBoard = pdfSearchRequest('pdf','U7000',5,null);
  assert.equal(navigation.accept(navigation.begin(returnFromBoard),true), true);
});

test('PDF selection suppression cannot swallow a different board reference', () => {
  const navigation = new PdfSearchNavigation();
  navigation.preservePdfSelection('U7000',3);
  const other = pdfSearchRequest('pdf','C1200',4,null);
  assert.equal(navigation.accept(navigation.begin(other),true), true);
});

test('an old term response cannot consume navigation for a newer board selection', () => {
  const navigation = new PdfSearchNavigation();
  const old = navigation.begin(pdfSearchRequest('pdf','U1',1,null));
  const current = navigation.begin(pdfSearchRequest('pdf','U2',2,null));
  assert.equal(navigation.accept(old,true), false);
  assert.equal(navigation.accept(current,true), true);
});
