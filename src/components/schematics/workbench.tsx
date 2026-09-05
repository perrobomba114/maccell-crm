"use client";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { CircuitBoard, Search, FileText, Loader2, Link2, Star, Copy, X } from "lucide-react";
import { sameDevice, type SchematicAsset } from "@/lib/schematics/catalog-types";
import { readWorkspaceLink, workspaceLink, type WorkspaceLocation } from "@/lib/schematics/workspace";
import {pairIsVerified} from '@/lib/schematics/pairing';
import {PairingStatus} from './pairing-status';
import { ConnectionInspector } from "./connection-inspector";
import { PdfPanel } from "./pdf-panel";
import { DocumentSearch } from "./document-search";
import { useExpandedWorkbench } from "./use-expanded-workbench";
import { WorkbenchHeader } from "./workbench-header";
import { LibrarySidebar, type CatalogPage } from "./library-sidebar";
import { useWorkspacePreferences } from "./use-workspace-preferences";
import { useBoardDocument } from "./use-board-document";
import { CircuitExplorer } from "./circuit-explorer";
import { IdentityEditor } from "./identity-editor";
import { useLinkedAssets } from "./use-linked-assets";
import { AssetIndexStatus } from "./asset-index-status";
import { RepairNotebook } from "./repair-notebook";
import "./workbench.css";
import "./pdf-reader.css";
import "./workspace-design.css";
import { WorkspaceWelcome } from "./workspace-welcome";

const BoardCanvas = dynamic(() => import("./board-canvas"), { ssr: false, loading: () => <div className="sch-empty">Preparando visor…</div> });
const emptyReferences = new Set<string>();
type Ui = { search: string; reference: string; library: boolean; inspector: boolean; mode: "board" | "split" | "pdf"; message: string; referenceToken: number };
export function SchematicsWorkbench({ initial, userId, canEditIdentity }: { initial: CatalogPage; userId: string; canEditIdentity: boolean }) {
  const expandedView = useExpandedWorkbench();
  const preferences = useWorkspacePreferences(userId);
  const [ui, updateUi] = useReducer((state: Ui, patch: Partial<Ui>) => ({ ...state, ...patch }), { search: "", reference: "", library: true, inspector: false, mode: "board", message: "", referenceToken: 0 });
  const [boardAsset, setBoardAsset] = useState<SchematicAsset | null>(null);
  const [pdf, setPdf] = useState<SchematicAsset | null>(null);
  const [pdfPage, setPdfPage] = useState(1);
  const currentPdfId = useRef<string | undefined>(undefined);
  useEffect(() => { currentPdfId.current = pdf?.id; }, [pdf?.id]);
  const { board, loading, error } = useBoardDocument(boardAsset);
  const [selection, setSelection] = useState<{ component: string | null; net: number | null }>({ component: null, net: null });
  const [focusToken, setFocusToken] = useState(0);
  const [referenceChoices, setReferenceChoices] = useState<{ component: string | null; net: number | null; label: string }[]>([]);
  const [anchor, setAnchor] = useState<SchematicAsset | null>(null);
  const [repairId, setRepairId] = useState<string>();
  const [repairLabel, setRepairLabel] = useState("");
  const restored = useRef(false);
  const pendingLocation = useRef<WorkspaceLocation | null>(null);
  const catalogCache = useRef(new Map(initial.assets.map(asset => [asset.id, asset])));
  const pdfReferences = useMemo(() => new Set([...(board?.components.map(item => item.name.toUpperCase()) ?? []), ...(board?.netCatalog.map(item => item.name.toUpperCase()) ?? [])]), [board]);
  const selectedComponent = board?.components.find(item => item.id === selection.component);
  const selectedNet = board?.netCatalog.find(item => item.id === selection.net);
  const candidate = !!(pdf && boardAsset && sameDevice(pdf, boardAsset));
  const activeAsset = ui.mode === "pdf" ? pdf : boardAsset ?? pdf;
  const locationState: WorkspaceLocation = { board: boardAsset?.id, pdf: pdf?.id, page: pdfPage, component: selectedComponent?.name, net: selectedNet?.name, repair: repairId };
  const currentLink = workspaceLink(locationState);

  const assetById = useCallback(async (id: string) => {
    const cached = catalogCache.current.get(id);
    if (cached) return cached;
    const response = await fetch(`/api/schematics/catalog?ids=${encodeURIComponent(id)}`);
    if (!response.ok) throw new Error("No se pudo recuperar el archivo guardado.");
    const result = await response.json() as CatalogPage;
    const asset = result.assets.find(item => item.id === id);
    if (!asset) throw new Error("El archivo ya no está disponible en la biblioteca.");
    catalogCache.current.set(id, asset);
    return asset;
  }, []);
  const openCounterpart = useCallback((asset: SchematicAsset) => {
    catalogCache.current.set(asset.id, asset);
    if (asset.kind === "pdf") { setPdf(asset); if (currentPdfId.current !== asset.id) setPdfPage(1); }
    else { setBoardAsset(asset); setSelection({ component: null, net: null }); updateUi({ reference: "" }); }
    updateUi({ mode: "split" });
  }, []);
  const { candidates: related, error: relatedError, verifiedIds, loading: linking } = useLinkedAssets(anchor, openCounterpart);
  const linked = !!(pdf && boardAsset && (pairIsVerified(pdf,boardAsset) || (anchor?.id===boardAsset.id && verifiedIds.includes(pdf.id)) || (anchor?.id===pdf.id && verifiedIds.includes(boardAsset.id))));
  function openAsset(asset: SchematicAsset) {
    setAnchor(asset); setReferenceChoices([]);
    catalogCache.current.set(asset.id, asset);
    preferences.remember(asset.id, asset.name);
    updateUi({ library: false, message: "" });
    if (asset.kind === "pdf") {
      const keepBoard=boardAsset&&sameDevice(asset,boardAsset);
      if(!keepBoard){setBoardAsset(null);setSelection({component:null,net:null});}
      setPdfPage(1); setPdf(asset); updateUi({reference:'',mode:keepBoard?'split':'pdf'}); return;
    }
    const keepPdf=pdf&&sameDevice(asset,pdf);
    if(!keepPdf){setPdf(null);setPdfPage(1);}
    if (asset.id !== boardAsset?.id) {
      setBoardAsset(asset); setSelection({ component: null, net: null }); updateUi({ reference: "" });
    }
    updateUi({ mode: keepPdf ? "split" : "board" });
  }
  async function openId(id: string, page?: number) {
    try { const asset = await assetById(id); openAsset(asset); if (page && asset.kind === "pdf") { setPdfPage(page); updateUi({ reference: "" }); } }
    catch (cause) { updateUi({ message: cause instanceof Error ? cause.message : "No se pudo abrir el archivo" }); }
  }
  useEffect(() => {
    if (!preferences.ready || restored.current) return;
    restored.current = true;
    const params = new URLSearchParams(window.location.search);
    const saved = params.has("board") || params.has("pdf") || params.has("repair") ? readWorkspaceLink(params) : preferences.location;
    if (!saved) return;
    setRepairId(saved.repair); pendingLocation.current = saved;
    if (!saved.board && !saved.pdf) { pendingLocation.current = null; return; }
    Promise.all([saved.board ? assetById(saved.board) : null, saved.pdf ? assetById(saved.pdf) : null]).then(([plate, document]) => {
      if (plate?.kind === "pcbe") setBoardAsset(plate);
      const compatibleDocument=document&&(!plate||sameDevice(plate,document))?document:null;
      setAnchor(plate??compatibleDocument);
      if (compatibleDocument?.kind === "pdf") { setPdf(compatibleDocument); setPdfPage(saved.page); }
      updateUi({ library: false, mode: plate && compatibleDocument ? "split" : compatibleDocument ? "pdf" : "board" });
      if (!plate) pendingLocation.current = null;
    }).catch((cause: unknown) => { pendingLocation.current = null; updateUi({ message: cause instanceof Error ? cause.message : "No se pudo restaurar la sesión" }); });
  }, [preferences.ready, preferences.location, assetById]);
  useEffect(() => {
    if (!board || !pendingLocation.current) return;
    const saved = pendingLocation.current;
    const component = board.components.find(item => item.name === saved.component);
    const net = board.netCatalog.find(item => item.name === saved.net);
    setSelection({ component: component?.id ?? null, net: net?.id ?? null });
    updateUi({ reference: saved.net ?? saved.component ?? "", referenceToken: 1 });
    if (component || net) setFocusToken(value => value + 1);
    pendingLocation.current = null;
  }, [board]);
  useEffect(() => {
    if (!repairId) return;
    const controller = new AbortController();
    fetch(`/api/schematics/repairs/${encodeURIComponent(repairId)}`, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("No tenés acceso a esta reparación o ya no está disponible.");
      const { repair } = await response.json() as { repair: { ticketNumber: string; deviceBrand: string; deviceModel: string } };
      if (!controller.signal.aborted) { setRepairLabel(`Orden ${repair.ticketNumber} · ${repair.deviceBrand} ${repair.deviceModel}`); updateUi({ search: `${repair.deviceBrand} ${repair.deviceModel}`, inspector: true }); }
    }).catch((cause: unknown) => { if (!controller.signal.aborted) updateUi({ message: cause instanceof Error ? cause.message : "Error al consultar reparación" }); });
    return () => controller.abort();
  }, [repairId]);
  useEffect(() => {
    if (!preferences.ready || pendingLocation.current || (!boardAsset && !pdf)) return;
    preferences.saveLocation(readWorkspaceLink(new URL(currentLink, window.location.origin).searchParams));
  }, [currentLink, preferences.ready, preferences.saveLocation, boardAsset, pdf]);
  function select(component: string | null, net: number | null, focus = false) {
    setReferenceChoices([]);
    if (linked && (component !== null || net !== null)) updateUi({ mode: "split" });
    setSelection({ component, net });
    updateUi({ referenceToken: ui.referenceToken + 1 });
    updateUi({ reference: (net !== null ? board?.netCatalog.find(item => item.id === net)?.name : board?.components.find(item => item.id === component)?.name) ?? "" });
    if (focus) setFocusToken(value => value + 1);
  }
  function selectPdfReference(term: string) {
    if (!linked || !board) return;
    const options = [
      ...board.components.filter(item => item.name.toUpperCase() === term.toUpperCase()).map(item => ({ component: item.id, net: null, label: `${item.name} · componente ${item.id}` })),
      ...board.netCatalog.filter(item => item.name.toUpperCase() === term.toUpperCase()).map(item => ({ component: null, net: item.id, label: `${item.name} · red ${item.id}` })),
    ];
    if (options.length > 1) { setReferenceChoices(options); return; }
    if (options.length === 1) { select(options[0].component, options[0].net, true); updateUi({ mode: "split" }); }
  }
  return <main ref={expandedView.root} className={`sch-app ${expandedView.expanded ? `sch-expanded ${expandedView.controlsHidden ? "sch-focus" : ""}` : ""} ${ui.inspector ? "" : "sch-hide-inspector"}`}>
    <WorkbenchHeader hasBoard={!!boardAsset} hasPdf={!!pdf} onHideControls={() => { updateUi({library:false,inspector:false}); expandedView.toggleControls(); }} expanded={expandedView.expanded} onExpand={() => { if (!expandedView.expanded) updateUi({ library: false, inspector: false }); void expandedView.toggle(); }} plates={initial.counts.pcbe} documents={initial.counts.pdf} model={activeAsset?.model ?? "Biblioteca técnica"} library={ui.library} inspector={ui.inspector} mode={ui.mode} onLibrary={() => updateUi({ library: !ui.library })} onInspector={() => updateUi({ inspector: !ui.inspector })} onMode={mode => updateUi({ mode })} />
    {expandedView.expanded && expandedView.controlsHidden && <button className="sch-restore-tools" onClick={expandedView.toggleControls} aria-label="Mostrar controles">Mostrar controles · H</button>}
    {repairLabel && <div className="sch-repair-context">{repairLabel}</div>}
    {(ui.message || preferences.warning || relatedError) && <div className="sch-notice" role="status">{ui.message || preferences.warning || relatedError}</div>}
    <div className={`sch-layout ${ui.library ? "" : "sch-no-library"}`}>
      {ui.library && <LibrarySidebar canReindex={canEditIdentity} initial={initial} search={ui.search} onSearch={search => updateUi({ search })} boardId={boardAsset?.id} pdfId={pdf?.id} onOpen={openAsset} onOpenId={id => void openId(id)} favorites={preferences.favorites} recent={preferences.recent} />}
      <div className="sch-workarea">
        <div className="sch-document-tab"><span className="sch-file-kind">{activeAsset?.kind === "pdf" ? <FileText size={15} /> : <CircuitBoard size={15} />}</span><span>{activeAsset?.name ?? "Mesa de trabajo"}</span>{pdf && boardAsset && <small><Link2 size={12} />{linked ? "Placa y PDF vinculados" : candidate ? "Catálogo sin verificar" : "Equipos distintos"}</small>}
          {activeAsset && <button aria-label="Guardar o quitar favorito" aria-pressed={preferences.favorites.includes(activeAsset.id)} onClick={() => preferences.toggleFavorite(activeAsset.id)}><Star size={16} fill={preferences.favorites.includes(activeAsset.id) ? "currentColor" : "none"} /></button>}
          {(boardAsset || pdf) && <button aria-label="Copiar enlace a esta vista" onClick={() => { void navigator.clipboard.writeText(new URL(currentLink, window.location.origin).href).then(() => updateUi({ message: "Enlace copiado con componente y página actuales." })).catch(() => updateUi({ message: "No se pudo copiar el enlace. Usá el enlace Abrir esta vista." })); }}><Copy size={16} /></button>}
          {(boardAsset || pdf) && <a className="sch-view-link" href={currentLink}>Abrir esta vista</a>}
        </div>
        {linking && <div className="sch-notice" role="status">Buscando documentos compatibles del equipo…</div>}
        {anchor && !linking && !relatedError && !related.length && <div className="sch-notice" role="status">{anchor.kind==='pcbe' ? 'No hay un PDF asociado a este modelo en la biblioteca.' : 'No hay una placa asociada a este modelo en la biblioteca.'}</div>}
        {anchor && related.length > 0 && <details key={anchor.id} className="sch-linked-choices"><summary>Archivos del equipo · {related.length}{linked ? ' · sincronizados' : ' · elegir documento'}</summary><div className="sch-related">{related.map(asset => <button key={asset.id} aria-pressed={asset.id === pdf?.id || asset.id === boardAsset?.id} onClick={() => openCounterpart(asset)}>{asset.name}<small>{(pairIsVerified(anchor,asset)||verifiedIds.includes(asset.id)) ? "Compatible" : "Sin verificar · abrir para revisar"}</small></button>)}</div></details>}
        {referenceChoices.length > 1 && <div className="sch-pdf-label-choices"><span>Hay varias ubicaciones con esa referencia:</span>{referenceChoices.map(item => <button key={item.label} onClick={() => { select(item.component, item.net, true); updateUi({ mode: "split" }); }}>{item.label}</button>)}<button onClick={() => setReferenceChoices([])}>Cerrar</button></div>}
        <div className={`sch-viewers sch-view-${ui.mode}`}>
          <div className="sch-board-slot" hidden={ui.mode === "pdf"}>
            {loading ? <div className="sch-empty"><Loader2 className="animate-spin" /><h3>Abriendo placa…</h3><p>Procesando componentes y redes.</p></div> : error ? <div className="sch-empty" role="alert"><h3>No se pudo abrir</h3><p>{error}</p><button onClick={() => setBoardAsset(boardAsset ? { ...boardAsset } : null)}>Reintentar</button></div> : board ? <BoardCanvas key={boardAsset?.id} board={board} component={selection.component} net={selection.net} onSelect={select} focusToken={focusToken} /> : <WorkspaceWelcome search={ui.search} onSearch={search => updateUi({ search, library: true })} onBrowse={() => updateUi({ library: true })} recent={preferences.recent} onOpen={id => void openId(id)} />}
          </div>
          <div className="sch-pdf-slot" hidden={ui.mode === "board"}>
            {pdf ? <PdfPanel key={pdf.id} page={pdfPage} onPage={setPdfPage} navigationToken={ui.referenceToken} canReindex={canEditIdentity} asset={pdf} reference={linked ? ui.reference : ""} references={linked ? pdfReferences : emptyReferences} onReference={selectPdfReference} /> : <div className="sch-empty"><FileText size={32} /><h3>Documentación del equipo</h3><p>Elegí un PDF. La sincronización requiere identidad técnica compatible.</p><div className="sch-related">{related.map(asset => <button key={asset.id} onClick={() => openAsset(asset)}>{asset.name}</button>)}</div><button onClick={() => updateUi({ library: true })}>Abrir biblioteca</button></div>}
          </div>
        </div>
        {pdf && boardAsset && <PairingStatus key={`${boardAsset.id}:${pdf.id}`} board={boardAsset} pdf={pdf} linked={linked} canEdit={canEditIdentity} onUpdated={asset=>{catalogCache.current.set(asset.id,asset);setBoardAsset(asset);setAnchor(asset);}} />}
      </div>
      <aside className="sch-inspector" aria-label="Inspector de circuito"><div className="sch-section-heading">EXPLORAR CIRCUITO<button aria-label="Cerrar inspector" onClick={() => updateUi({ inspector: false })}><X size={16} /></button></div><label className="sch-search"><Search size={15} /><input aria-label="Buscar componente o red" placeholder="U4000, PP_VDD_MAIN…" value={ui.reference} onChange={event => updateUi({ reference: event.target.value })} /></label>
        {selectedComponent && <div className="sch-selection"><span>COMPONENTE</span><strong>{selectedComponent.name}</strong><small>{selectedComponent.kind} · {selectedComponent.pads.length} pads</small></div>}
        {selectedNet && <div className="sch-selection"><span>RED SELECCIONADA</span><strong>{selectedNet.name}</strong><small>{selectedNet.pinCount} pads · {selectedNet.viaCount} vías</small></div>}
        <div className="sch-inspector-scroll">
          {repairId && <RepairNotebook repairId={repairId} asset={activeAsset} component={activeAsset?.kind === "pcbe" || linked ? selectedComponent?.name : undefined} pdfAssetId={pdf?.id} page={pdf ? pdfPage : undefined} documentUrl={currentLink} />}
          {board && <ConnectionInspector board={board} component={selection.component} net={selection.net} onSelect={(component, net) => select(component, net, true)} onFocus={() => setFocusToken(value => value + 1)} />}
          <DocumentSearch key={`documents:${activeAsset?.id}`} assetId={activeAsset?.id} onOpen={(id, page) => void openId(id, page)} />
          <CircuitExplorer key={`circuit:${boardAsset?.id}`} board={board} query={ui.reference} component={selection.component} net={selection.net} onSelect={(component, net) => select(component, net, true)} />
          {activeAsset && <details className="sch-technical-details"><summary>Datos del archivo e identidad</summary>
          {boardAsset && <AssetIndexStatus key={`index:${boardAsset.id}`} asset={boardAsset} canReindex={canEditIdentity} />}
          {activeAsset && <IdentityEditor key={activeAsset.id} asset={activeAsset} canEdit={canEditIdentity} onUpdated={asset => {
            catalogCache.current.set(asset.id, asset);
            if (boardAsset?.id === asset.id) setBoardAsset(asset);
            if (pdf?.id === asset.id) setPdf(asset);
            setAnchor(asset);
            updateUi({ message: "Identidad técnica actualizada." });
          }} />}
          </details>}
          {board && <details className="sch-diagnostics"><summary>Lectura del archivo</summary><p>{board.geometry.length.toLocaleString("es-AR")} elementos decodificados</p>{board.warnings.map((warning, index) => <p key={index}>{warning}</p>)}</details>}
        </div>
      </aside>
    </div>
  </main>;
}
