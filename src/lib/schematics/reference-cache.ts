import {containsReference,type PdfBox} from './linked-navigation';
export type ReferencePage={page:number;text:string;boxes:PdfBox[]};
export type ReferenceMatch={page:number;excerpt:string;boxes?:PdfBox[]};
export function buildReferenceLookup(pages:ReferencePage[]){
 const index=new Map<string,ReferenceMatch[]>();
 for(const page of pages){
  const tokens=new Set(page.text.toUpperCase().match(/[A-Z0-9_]+(?:[.+/-][A-Z0-9_]+)*/g)??[]);
  for(const token of [...tokens])for(const part of token.split(/[.+/-]/))tokens.add(part);
  const boxes=new Map<string,PdfBox[]>();
  for(const box of page.boxes){
   const labels=new Set(box.text.toUpperCase().match(/[A-Z0-9_]+/g)??[]);
   for(const label of labels){const group=boxes.get(label)??[];group.push(box);boxes.set(label,group);}
  }
  for(const token of tokens){
   if(token.length<2)continue;
   const position=page.text.toUpperCase().indexOf(token);
   const matches=index.get(token)??[];
   matches.push({page:page.page,excerpt:page.text.slice(Math.max(0,position-65),position+token.length+100),boxes:boxes.get(token)?.filter(box=>containsReference(box.text,token))??[]});
   index.set(token,matches);
  }
 }
 return {get:(term:string)=>index.get(term.trim().toUpperCase())};
}
