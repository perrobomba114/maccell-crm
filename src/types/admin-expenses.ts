export type AdminExpense = {
    id: string;
    amount: number;
    description: string;
    createdAt: Date;
    user: {
        name: string;
        imageUrl: string | null;
    };
    branch: {
        id: string;
        name: string;
        code: string;
    };
};

export type ExpenseBranchSummary = {
    branchId: string;
    branchName: string;
    total: number;
    count: number;
};
