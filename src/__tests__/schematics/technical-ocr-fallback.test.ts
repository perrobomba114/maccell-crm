import test from 'node:test';
import assert from 'node:assert/strict';
import { recognizeTechnicalPage, type OcrRunner } from '../../lib/schematics/technical-ocr';
const timeout = () => Object.assign(new Error('OCR deadline exceeded'), { killed: true, signal: 'SIGTERM', code: null });
const tsv = 'level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n1\t1\t0\t0\t0\t0\t0\t0\t2000\t1000\t-1\t\n5\t1\t1\t1\t1\t1\t200\t100\t100\t50\t90\tU9500';

test('a Tesseract timeout retries once at 2000 pixels with sparse text and retains normalized coordinates', async () => {
  const calls: {command:string;args:string[];timeout:number}[] = [];
  const run: OcrRunner = async (command,args,options) => {
    calls.push({command,args,timeout:options.timeout});
    if (command === 'tesseract' && !args.includes('--psm')) throw timeout();
    return {stdout:command === 'tesseract' ? tsv : ''};
  };
  const page = await recognizeTechnicalPage('source.pdf','page-95',95,'eng',undefined,run);
  assert.deepEqual(calls.map(call=>call.command),['pdftoppm','tesseract','pdftoppm','tesseract']);
  assert.equal(calls[0].args[calls[0].args.indexOf('-scale-to')+1],'4000');
  assert.equal(calls[2].args[calls[2].args.indexOf('-scale-to')+1],'2000');
  assert.equal(calls[3].args[calls[3].args.indexOf('--psm')+1],'11');
  assert.equal(calls[3].args[calls[3].args.indexOf('-l')+1],'eng');
  assert.ok(calls.every(call=>call.timeout>0&&call.timeout<=90_000));
  assert.equal(page.page,95); assert.equal(page.source,'ocr');
  assert.deepEqual(page.boxes,[{text:'U9500',x:.1,y:.1,width:.05,height:.05}]);
});

test('configuration, missing executable and maxBuffer errors are not retried', async () => {
  for (const error of [Object.assign(new Error('missing traineddata'),{code:1,killed:false}),Object.assign(new Error('missing binary'),{code:'ENOENT'}),Object.assign(new Error('buffer exceeded'),{code:'ERR_CHILD_PROCESS_STDIO_MAXBUFFER',killed:true,signal:'SIGTERM'})]) {
    let calls=0;
    const run: OcrRunner = async command => { calls++; if(command==='tesseract')throw error;return {stdout:''}; };
    await assert.rejects(recognizeTechnicalPage('source.pdf','page-95',95,'eng',undefined,run),cause=>cause===error);
    assert.equal(calls,2);
  }
});

test('raster timeout is not mistaken for a Tesseract timeout', async () => {
  let calls=0; const error=timeout();
  await assert.rejects(recognizeTechnicalPage('source.pdf','page-95',95,'eng',undefined,async()=>{calls++;throw error;}),cause=>cause===error);
  assert.equal(calls,1);
});

test('shutdown during timed-out OCR never starts a fallback raster or recognizer', async () => {
  const stop=new AbortController(); let calls=0;
  const run: OcrRunner=async command=>{calls++;if(command==='tesseract'){stop.abort();throw timeout();}return {stdout:''};};
  await assert.rejects(recognizeTechnicalPage('source.pdf','page-95',95,'eng',stop.signal,run),error=>error instanceof Error&&error.name==='AbortError');
  assert.equal(calls,2);
});

test('a failed fallback remains a failure and cannot start a third OCR attempt', async () => {
  let calls=0; const finalError=timeout();
  const run: OcrRunner=async command=>{calls++;if(command==='tesseract')throw finalError;return {stdout:''};};
  await assert.rejects(recognizeTechnicalPage('source.pdf','page-95',95,'eng',undefined,run),error=>error===finalError);
  assert.equal(calls,4);
});

test('fallback without legible words cannot silently mark the timed-out page recovered', async () => {
  const run: OcrRunner=async(command,args)=>{if(command==='tesseract'&&!args.includes('--psm'))throw timeout();return {stdout:''};};
  await assert.rejects(recognizeTechnicalPage('source.pdf','page-95',95,'eng',undefined,run),/OCR_FALLBACK_EMPTY/);
});

test('the native execFile timeout shape triggers the bounded fallback', async () => {
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const execute=promisify(execFile);
  let recognizers=0;
  const run: OcrRunner=async command=>{
    if(command!=='tesseract')return {stdout:''};
    if(++recognizers===1)await execute(process.execPath,['-e','setTimeout(() => {}, 10000)'],{timeout:20});
    return {stdout:tsv};
  };
  const page=await recognizeTechnicalPage('source.pdf','page-95',95,'eng',undefined,run);
  assert.equal(recognizers,2);assert.equal(page.text,'U9500');
});

test('successful default OCR never lowers resolution or changes segmentation mode', async () => {
  const calls:string[][]=[];
  const run: OcrRunner=async(command,args)=>{calls.push(args);return {stdout:command==='tesseract'?tsv:''};};
  await recognizeTechnicalPage('source.pdf','page-95',95,'eng',undefined,run);
  assert.equal(calls.length,2);assert.equal(calls[0][calls[0].indexOf('-scale-to')+1],'4000');
  assert.equal(calls[1].includes('--psm'),false);
});
