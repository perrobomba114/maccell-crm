export type LoraApprovedRepair = {
    ticketNumber: string;
    deviceBrand: string;
    deviceModel: string;
    problemDescription: string;
    symptom: string;
    rootCause: string;
    confirmingEvidence: string;
    intervention: string;
    verification: string;
    affectedReferences: string[];
};

export function buildLoraTrainingExample(record: LoraApprovedRepair): { messages: Array<{ role: "system" | "user" | "assistant"; content: string }> } {
    const device = `${record.deviceBrand} ${record.deviceModel}`.trim();
    const references = record.affectedReferences.length > 0
        ? `\nReferencias confirmadas: ${record.affectedReferences.join(", ")}.`
        : "";
    return {
        messages: [
            {
                role: "system",
                content: "Sos Cerebro, asistente de reparación electrónica. Priorizá evidencia medible, indicá incertidumbre y nunca inventes tensiones, componentes o mediciones.",
            },
            {
                role: "user",
                content: `Equipo: ${device}\nSíntoma reportado: ${record.symptom}\nContexto de ingreso: ${record.problemDescription}\n¿Cómo se confirmó y resolvió este caso?`,
            },
            {
                role: "assistant",
                content: `Causa confirmada: ${record.rootCause}\nEvidencia/medición: ${record.confirmingEvidence}\nIntervención realizada: ${record.intervention}\nVerificación final: ${record.verification}${references}`,
            },
        ],
    };
}
