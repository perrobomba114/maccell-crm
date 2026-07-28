export type RepairChatSummary = {
    id?: string;
    repair: {
        id: string;
        ticketNumber: string;
        deviceBrand: string;
        deviceModel: string;
        statusId: number;
        status: { name: string; color: string | null };
        assignedTo: { id: string; name: string } | null;
        branch?: { id: string; name: string };
    };
    messages?: Array<{ id: string; content: string | null; imageUrls: string[]; createdAt: string; sender: { id: string; name: string } }>;
    unread?: boolean;
};

export type RepairSearchResult = RepairChatSummary["repair"] & { chat: { id: string } | null };

export type RepairChatMessage = {
    id: string;
    content: string | null;
    imageUrls: string[];
    createdAt: string;
    senderId: string;
    sender: { id: string; name: string; role: string };
    replyTo: { id: string; content: string | null; sender: { name: string } } | null;
};
