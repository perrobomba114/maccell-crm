import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const outputPath = resolve(process.argv[2] ?? "tmp/cerebro-lora-historical.jsonl");
const phonePattern = /(?:\+?54\s*)?(?:9\s*)?(?:\(?\d{2,4}\)?[\s.-]*)?\d{4}[\s.-]?\d{4}/g;
const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const pricePattern = /(?:US\$|USD|ARS|\$)\s*\d[\d.,]*/gi;

function clean(value: string): string {
    return value.replace(emailPattern, "[EMAIL_REMOVIDO]")
        .replace(phonePattern, "[TELEFONO_REMOVIDO]")
        .replace(pricePattern, "[PRECIO_REMOVIDO]")
        .replace(/\s+/g, " ").trim();
}

async function main(): Promise<void> {
    const repairs = await db.repair.findMany({
        where: {
            statusId: { in: [5, 10] },
            diagnosis: { not: null },
        },
        select: {
            deviceBrand: true,
            deviceModel: true,
            problemDescription: true,
            diagnosis: true,
        },
        orderBy: { updatedAt: "asc" },
    });
    const examples = repairs.flatMap((repair) => {
        const problem = clean(repair.problemDescription);
        const diagnosis = clean(repair.diagnosis ?? "");
        if (problem.length < 8 || diagnosis.length < 60) return [];
        return [JSON.stringify({
            messages: [
                {
                    role: "system",
                    content: "Sos Cerebro, asistente de reparación electrónica. Priorizá mediciones, evidencia y límites de certeza. Nunca inventes tensiones, componentes o pasos.",
                },
                {
                    role: "user",
                    content: `Equipo: ${clean(`${repair.deviceBrand} ${repair.deviceModel}`)}\nSíntoma: ${problem}\nIndicá un diagnóstico técnico y el próximo paso verificable.`,
                },
                { role: "assistant", content: diagnosis },
            ],
        })];
    });
    await mkdir(resolve(outputPath, ".."), { recursive: true });
    await writeFile(outputPath, `${examples.join("\n")}\n`, "utf8");
    process.stdout.write(`${JSON.stringify({ outputPath, examples: examples.length })}\n`);
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "dataset export failed");
    process.exitCode = 1;
}).finally(() => db.$disconnect());
