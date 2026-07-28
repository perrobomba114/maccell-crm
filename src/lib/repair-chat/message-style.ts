import type { RepairChatRole } from "@/lib/repair-chat/navigation";

export type RepairChatMessageStyle = {
    bubble: string;
    metadata: string;
    reply: string;
    footer: string;
    readReceipt: string;
};

const MESSAGE_STYLES: Record<RepairChatRole, RepairChatMessageStyle> = {
    VENDOR: {
        bubble: "border-emerald-400/60 bg-emerald-600 text-white",
        metadata: "text-emerald-100",
        reply: "border-emerald-200 bg-emerald-950/25 text-emerald-50",
        footer: "text-emerald-100",
        readReceipt: "text-cyan-100",
    },
    TECHNICIAN: {
        bubble: "border-blue-400/60 bg-blue-600 text-white",
        metadata: "text-blue-100",
        reply: "border-blue-200 bg-blue-950/25 text-blue-50",
        footer: "text-blue-100",
        readReceipt: "text-cyan-100",
    },
    ADMIN: {
        bubble: "border-zinc-500 bg-black text-white",
        metadata: "text-zinc-200",
        reply: "border-zinc-300 bg-zinc-800 text-zinc-100",
        footer: "text-zinc-300",
        readReceipt: "text-cyan-300",
    },
};

export function getRepairChatMessageStyle(role: RepairChatRole): RepairChatMessageStyle {
    return MESSAGE_STYLES[role];
}
