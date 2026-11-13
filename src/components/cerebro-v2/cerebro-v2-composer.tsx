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
        <div className="bench-compose border-t border-zinc-700/70 bg-zinc-900 p-3 md:p-4">
            <div className="mx-auto max-w-4xl">
                {files.length > 0 ? (
                    <div className="mb-2 flex gap-2 overflow-x-auto">
                        {files.map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center gap-2 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-300"><span className="max-w-36 truncate">{file.name}</span><button type="button" onClick={() => setFiles((items) => items.filter((_, itemIndex) => itemIndex !== index))}><X size={12} /></button></div>)}
                    </div>
                ) : null}
                <div className="bench-input flex items-end gap-2 rounded-lg border border-zinc-600 bg-zinc-950 p-2 focus-within:border-blue-500/70">
                    <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 5))} />
                    <button type="button" onClick={() => inputRef.current?.click()} disabled={props.disabled || props.streaming} aria-label="Adjuntar imágenes" className="rounded-md p-2.5 text-zinc-500 hover:bg-zinc-800 hover:text-blue-300 disabled:opacity-40"><ImagePlus size={19} /></button>
                    <textarea disabled={props.disabled} value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(); } }} rows={1} placeholder={props.disabled ? "Chat en modo lectura" : "Preguntá por el caso o registrá lo que comprobaste…"} className="max-h-36 min-h-10 flex-1 resize-none bg-transparent px-1 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600" />
                    {props.streaming ? <button type="button" onClick={props.onStop} className="rounded-md bg-amber-400 p-2.5 text-zinc-950"><Square size={17} /></button> : <button type="button" onClick={() => void submit()} disabled={props.disabled || (!text.trim() && files.length === 0)} className="rounded-md bg-blue-600 p-2.5 text-white hover:bg-blue-700 disabled:opacity-30"><Send size={17} /></button>}
                </div>
            </div>
        </div>
    );
}
