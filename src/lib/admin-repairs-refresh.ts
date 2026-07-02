type AdminRepairsAutoRefreshState = {
    localSearchTerm: string;
    searchTerm: string;
    isPending: boolean;
    loadingRepairId: string | null;
    hasOpenDetail: boolean;
};

export function shouldPauseAdminRepairsAutoRefresh(state: AdminRepairsAutoRefreshState) {
    return (
        state.localSearchTerm.trim().length > 0 ||
        state.searchTerm.trim().length > 0 ||
        state.isPending ||
        state.loadingRepairId !== null ||
        state.hasOpenDetail
    );
}
