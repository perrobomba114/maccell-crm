import type {
    BuildNotificationCenterPageOptions,
    NotificationCenterBranchOption,
    NotificationCenterSource,
} from "./notification-center";
import {
    extractNotificationSaleNumber,
    isJsonObject,
    normalizeNotificationText,
    readNotificationString,
} from "./notification-center-utils";

export function deriveNotificationBranches(
    notification: NotificationCenterSource,
    options: BuildNotificationCenterPageOptions
): NotificationCenterBranchOption[] {
    const matches = new Map<string, NotificationCenterBranchOption>();
    const addBranch = (branch: NotificationCenterBranchOption | undefined | null) => {
        if (branch) matches.set(branch.id, branch);
    };

    const actionData = isJsonObject(notification.actionData) ? notification.actionData : null;
    if (actionData) {
        addBranch(findBranchById(options.branches, readNotificationString(actionData.branchId)));
        addBranch(findBranchById(options.branches, readNotificationString(actionData.sourceBranchId)));
        addBranch(findBranchById(options.branches, readNotificationString(actionData.targetBranchId)));
        addBranch(findBranchByText(options.branches, readNotificationString(actionData.branchName)));
        addBranch(findBranchByText(options.branches, readNotificationString(actionData.sourceBranchName)));
        addBranch(findBranchByText(options.branches, readNotificationString(actionData.targetBranchName)));
        addBranch(findBranchByText(options.branches, readNotificationString(actionData.branchCode)));
        addBranch(findBranchByText(options.branches, readNotificationString(actionData.ticketNumber)));
        const saleId = readNotificationString(actionData.saleId);
        if (saleId) {
            addBranch(options.relatedSaleIdBranches?.[saleId]);
        }
    }

    const saleNumber = extractNotificationSaleNumber(notification);
    if (saleNumber) {
        addBranch(options.relatedSaleBranches?.[saleNumber]);
    }

    const searchableText = `${notification.title} ${notification.message} ${notification.link ?? ""}`;
    for (const branch of options.branches) {
        if (doesTextMentionBranch(searchableText, branch)) {
            addBranch(branch);
        }
    }

    return Array.from(matches.values());
}

function findBranchById(
    branches: NotificationCenterBranchOption[],
    id: string | null
): NotificationCenterBranchOption | undefined {
    return id ? branches.find((branch) => branch.id === id) : undefined;
}

function findBranchByText(
    branches: NotificationCenterBranchOption[],
    value: string | null
): NotificationCenterBranchOption | undefined {
    if (!value) return undefined;
    const normalizedValue = normalizeNotificationText(value);

    return branches.find((branch) => {
        return [
            branch.id,
            branch.name,
            branch.code ?? "",
            branch.ticketPrefix ?? "",
        ].some((candidate) => normalizeNotificationText(candidate) === normalizedValue);
    });
}

function doesTextMentionBranch(text: string, branch: NotificationCenterBranchOption): boolean {
    const normalizedText = normalizeNotificationText(text);
    const tokens = [branch.name, branch.code, branch.ticketPrefix]
        .filter((value): value is string => Boolean(value?.trim()))
        .map(normalizeNotificationText)
        .filter(Boolean);

    return tokens.some((token) => normalizedText.includes(token));
}
