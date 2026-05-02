export type ReturnStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export type ReturnPart = {
    quantity: number;
    name: string;
    code?: string;
};

export type ReturnRequestForAdmin = {
    id: string;
    status: ReturnStatus;
    technicianNote: string | null;
    adminNote: string | null;
    createdAt: Date | string;
    partsSnapshot?: unknown;
    technician: {
        name: string;
    };
    repair: {
        ticketNumber: string;
        customer: {
            name: string;
            phone: string | null;
        };
        status: {
            name: string;
        };
        parts: Array<{
            id: string;
            quantity: number;
            sparePart: {
                name: string;
                code?: string | null;
                sku?: string | null;
            };
        }>;
    };
};
