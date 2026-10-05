import assert from 'node:assert/strict';
import test from 'node:test';
import { boundsFor, renderBoard } from '../../components/schematics/board-renderer';
import type { GeometryPrimitive, PcbeDocument } from '../../lib/schematics/types';

const geometry: GeometryPrimitive[] = [
  { kind:'pin', layer:1, x:20, y:20, radius:2, netIndex:1, componentId:'C1', name:'1' },
  { kind:'pin', layer:1, x:40, y:20, radius:2, netIndex:2, componentId:'C1', name:'2' },
  { kind:'outline', layer:1, x1:15, y1:15, x2:45, y2:15, width:1, componentId:'C1' },
];
const board = { geometry, components:[{id:'C1',name:'C1',kind:'Capacitor',outlineCount:1,pads:[
  {id:'1',name:'1',componentId:'C1',layer:1,x:20,y:20,radius:2,netIndex:1},
  {id:'2',name:'2',componentId:'C1',layer:1,x:40,y:20,radius:2,netIndex:2},
]}], netCatalog:[{id:1,name:'VBAT'},{id:2,name:'GND'}], name:'fixture' } as PcbeDocument;

test('an explicit pad net pulses only that net and leaves component outlines in the steady pass', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { value:{devicePixelRatio:1}, configurable:true });
  try {
    const fills: string[] = [], strokes: string[] = [];
    const context = {
      fillStyle:'',strokeStyle:'',globalAlpha:1,lineWidth:1,font:'',
      setTransform(){},fillRect(){},beginPath(){},moveTo(){},lineTo(){},arc(){},fillText(){},
      measureText(){return {width:20};},
      fill(){fills.push(this.fillStyle);},stroke(){strokes.push(this.strokeStyle);},
    };
    const canvas = {clientWidth:500,clientHeight:400,getContext:()=>context} as unknown as HTMLCanvasElement;
    renderBoard(canvas,board,boundsFor(geometry),{zoom:1,x:0,y:0},new Set([1]),'C1',1,'clean',false,{pass:'selection',color:'#0066ff'});
    assert.deepEqual(fills,['#0066ff'], 'the other pad of C1 must not pulse');
    assert.deepEqual(strokes,[], 'outline must not be on animated canvas');
    fills.length=0;
    renderBoard(canvas,board,boundsFor(geometry),{zoom:1,x:0,y:0},new Set([1]),'C1',1,'clean',false,{pass:'base',theme:'light'});
    assert.deepEqual(strokes,['#e6008d']);
    assert.equal(fills.length,1,'unselected pad remains visible on the base');
  } finally {
    if (original) Object.defineProperty(globalThis,'window',original);
    else Reflect.deleteProperty(globalThis,'window');
  }
});
