import { getCurrentUser } from "@/actions/auth-actions";
import { canUseCerebroV2 } from "@/lib/cerebro-v2/access";
import { parseCerebroChatRequest } from "@/lib/cerebro-v2/chat-contract";
import { cerebroChatRepository } from "@/lib/cerebro-v2/chat-repository";
import { groundedUiResponse } from "@/lib/cerebro-v2/chat-stream";
import { validateGuidedAnswer } from "@/lib/cerebro-v2/guided-diagnosis";
import { extractMessageInput } from "@/lib/cerebro-v2/message-content";
import { getAuthorizedCerebroRepair } from "@/lib/cerebro-v2/repair-context";
import { diagnoseRepair } from "@/lib/cerebro-v2/diagnosis-service";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request): Promise<Response> {
    let observationSaved = false;
    try {
        const user = await getCurrentUser();
        if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
        if (!canUseCerebroV2(user.role)) return Response.json({ error: "Sin acceso" }, { status: 403 });
        const parsed = parseCerebroChatRequest(await request.json());
        if (!parsed.success) return Response.json({ error: parsed.error }, { status: 400 });
        const data=parsed.data;
        const session=await cerebroChatRepository.getSession(user.id,data.sessionId);
        if (!session) return Response.json({error:"El chat no existe o no te pertenece"},{status:404});
        if (!session.repairId) return Response.json({error:"El chat no está vinculado a una reparación"},{status:409});
        const repair=await getAuthorizedCerebroRepair(user,session.repairId);
        if (!repair) return Response.json({error:"La reparación fue finalizada o reasignada; el chat queda en modo lectura"},{status:403});
        const previous=await cerebroChatRepository.listMessages(user.id,session.id);
        const completed=previous.find(m=>m.clientMessageId===`${data.clientMessageId}:assistant`);
        if (completed) return groundedUiResponse(completed.clientMessageId,completed.content,{
            ...completed.metadata,promptVersion:completed.promptVersion??"stored",provider:completed.provider??"stored",sources:completed.sources,
        });
        const lastUser=data.messages.findLast(m=>m.role==='user');
        if (!lastUser) return Response.json({error:"Describí el síntoma"},{status:400});
        const query=extractMessageInput(lastUser);
        const pending=previous.findLast(m=>m.role==='assistant')?.metadata.guidedQuestion??null;
        const option=validateGuidedAnswer(pending,data.guidedAnswer);
        if (data.guidedAnswer&&!option) return Response.json({error:"La comprobación cambió. Respondé al último paso del chat."},{status:409});
        const text=option?.label??query.text;
        const answerContext=pending ? {question:pending.prompt,conditions:pending.conditions} : undefined;
        if (!text&&!query.images.length) return Response.json({error:"Describí el síntoma o adjuntá una imagen"},{status:400});
        await cerebroChatRepository.appendMessage({userId:user.id,sessionId:session.id,clientMessageId:data.clientMessageId,
            role:'user',content:text,attachments:query.images,sources:[],promptVersion:null,provider:null,
            metadata:{answerContext,...(option&&data.guidedAnswer?{guidedAnswer:{...data.guidedAnswer,observation:option.observation}}:{})}});
        observationSaved = true;
        const persisted=await cerebroChatRepository.listRepairMessages(user.id,repair.id);
        const result=await diagnoseRepair({repair,text,images:query.images,messageId:data.clientMessageId,answerContext,
            history:persisted.filter(m=>m.clientMessageId!==data.clientMessageId).map(m=>({id:m.clientMessageId,role:m.role,content:m.content,question:m.metadata.diagnosticPlan?.question??m.metadata.guidedQuestion?.prompt,answerContext:m.metadata.answerContext}))});
        await cerebroChatRepository.appendMessage({userId:user.id,sessionId:session.id,clientMessageId:`${data.clientMessageId}:assistant`,
            role:'assistant',content:result.text,attachments:[],sources:result.metadata.sources,promptVersion:result.metadata.promptVersion,
            provider:result.metadata.provider,metadata:{diagnosticState:result.metadata.diagnosticState,diagnosticPlan:result.metadata.diagnosticPlan,
                guidedQuestion:result.metadata.guidedQuestion,retrievalWarnings:result.metadata.retrievalWarnings}});
        await cerebroChatRepository.touchSession(user.id,session.id,session.title==='Nuevo diagnóstico'?`${repair.deviceBrand} ${repair.deviceModel} · ${text}`.slice(0,80):undefined);
        return groundedUiResponse(`${data.clientMessageId}:assistant`,result.text,result.metadata);
    } catch (error) {
        console.error("[cerebro-v2/chat] Error:",error instanceof Error?error.message:"unknown error");
        return Response.json({error:observationSaved ? "No se pudo completar la consulta. Tu observación permanece guardada; podés reintentar." : "No se pudo guardar la consulta. Reintentá el envío."},{status:503});
    }
}
