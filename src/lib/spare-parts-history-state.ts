export function updateHistoryChecked<T extends { id: string; isChecked: boolean }>(
    rows: T[],
    id: string,
    isChecked: boolean,
): T[] {
    return rows.map((row) => row.id === id ? { ...row, isChecked } : row);
}
