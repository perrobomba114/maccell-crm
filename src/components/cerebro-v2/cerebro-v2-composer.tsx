"use client";

import { ImagePlus, Send, Square, X } from "lucide-react";
import { useRef, useState } from "react";

type ComposerProps = {
    disabled: boolean;
    streaming: boolean;
    onSend: (text: string, files: readonly File[]) => Promise<boolean>;
    onStop: () => void;
};

export function CerebroV2Composer(props: ComposerProps) {
    const [text, setText] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    const submit = async () => {
        if (props.disabled || props.streaming) return;
        if (await props.onSend(text, files)) { setText(""); setFiles([]); }
    };
    return (
        <div className="border-t border-slate-700/70 bg-[#101820] p-3 md:p-4">
            <div className="mx-auto max-w-4xl">
                {files.length > 0 ? (
                    <div className="mb-2 flex gap-2 overflow-x-auto">
                        {files.map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center gap-2 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300"><span className="max-w-36 truncate">{file.name}</span><button type="button" onClick={() => setFiles((items) => items.filter((_, itemIndex) => itemIndex !== index))}><X size={12} /></button></div>)}
                    </div>
                ) : null}
                <div className="flex items-end gap-2 rounded-lg border border-slate-600 bg-[#080e13] p-2 focus-within:border-cyan-500/70">
                    <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 5))} />
                    <button type="button" onClick={() => inputRef.current?.click()} disabled={props.streaming} aria-label="Adjuntar imágenes" className="rounded-md p-2.5 text-slate-500 hover:bg-slate-800 hover:text-cyan-300 disabled:opacity-40"><ImagePlus size={19} /></button>
                    <textarea value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(); } }} rows={1} placeholder={props.disabled ? "Seleccioná el modelo exacto para comenzar" : "Describí síntoma, consumo y mediciones realizadas…"} className="max-h-36 min-h-10 flex-1 resize-none bg-transparent px-1 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600" />
                    {props.streaming ? <button type="button" onClick={props.onStop} className="rounded-md bg-amber-400 p-2.5 text-slate-950"><Square size={17} /></button> : <button type="button" onClick={() => void submit()} disabled={props.disabled || (!text.trim() && files.length === 0)} className="rounded-md bg-cyan-500 p-2.5 text-slate-950 hover:bg-cyan-400 disabled:opacity-30"><Send size={17} /></button>}
                </div>
                <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-wider text-slate-600">Resultados basados en reparaciones MACCELL y documentación indexada</p>
            </div>
        </div>
    );
}
