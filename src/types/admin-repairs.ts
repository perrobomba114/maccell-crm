export type AdminRepairBranch = {
    id: string;
    name: string;
};

export type AdminRepairsQuery = {
    query?: string;
    branchId?: string;
    warrantyOnly?: boolean;
    technician?: string;
    technicianId?: string;
    date?: string;
    page?: number;
    pageSize?: number;
};

export type AdminRepair = {
    id: string;
    ticketNumber: string;
    branchId: string;
    createdAt: Date | string;
    startedAt?: Date | string | null;
    finishedAt?: Date | string | null;
    customer: {
        name: string;
        phone?: string | null;
    };
    deviceBrand: string;
    deviceModel: string;
    branch?: { name: string } | null;
    assignedTo?: { name: string } | null;
    status: {
        name: string;
        color: string | null;
    };
    statusId: number;
    statusHistory?: {
        toStatusId: number;
        createdAt: Date | string;
        user?: { name: string } | null;
        fromStatus?: { name: string } | null;
    }[];
    isWarranty?: boolean;
    isWet?: boolean;
    estimatedPrice: number | null;
};

export type AdminRepairsResult = {
    repairs: AdminRepair[];
    total: number;
    page: number;
    pageSize: number;
};
