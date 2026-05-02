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
        name: string;
    };
};

export type ExpenseBranchSummary = {
    branchName: string;
    total: number;
    count: number;
};
