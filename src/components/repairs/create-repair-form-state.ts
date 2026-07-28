import type { RepairIntake, RepairAccessType } from "@/lib/repairs/intake";
import type { SparePartItem } from "./spare-part-selector";

export type CreateRepairFormErrors = Partial<Record<
    "name" | "phone" | "email" | "brand" | "model" | "problem" | "ticket" | "warranty" | "price" | "intake",
    string
>>;

export type CreateRepairFormState = {
    selectedUserId: string;
    isSubmitting: boolean;
    showConfirmDialog: boolean;
    isWarranty: boolean;
    isWet: boolean;
    originalRepairId: string | null;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    brand: string;
    model: string;
    problem: string;
    notes: string;
    promisedAt: Date;
    ticketNumber: string;
    selectedParts: SparePartItem[];
    estimatedPrice: string;
    errors: CreateRepairFormErrors;
    intake: RepairIntake;
};

type SetFieldAction = {
    [Field in keyof CreateRepairFormState]: {
        type: "setField";
        field: Field;
        value: CreateRepairFormState[Field];
    }
}[keyof CreateRepairFormState];

export type CreateRepairFormAction = SetFieldAction
    | { type: "setIntake"; value: RepairIntake }
    | { type: "setAccessType"; value: RepairAccessType };

export function createInitialRepairFormState(
    promisedAt: Date,
    selectedUserId: string,
): CreateRepairFormState {
    return {
        selectedUserId,
        isSubmitting: false,
        showConfirmDialog: false,
        isWarranty: false,
        isWet: false,
        originalRepairId: null,
        customerName: "",
        customerPhone: "",
        customerEmail: "",
        brand: "",
        model: "",
        problem: "",
        notes: "",
        promisedAt,
        ticketNumber: "",
        selectedParts: [],
        estimatedPrice: "",
        errors: {},
        intake: {
            accessType: "NONE",
            accessCredential: null,
            hasSimCard: false,
            hasMemoryCard: false,
        },
    };
}

export function createRepairFormReducer(
    state: CreateRepairFormState,
    action: CreateRepairFormAction,
): CreateRepairFormState {
    if (action.type === "setIntake") {
        return { ...state, intake: action.value };
    }
    if (action.type === "setAccessType") {
        return {
            ...state,
            intake: {
                ...state.intake,
                accessType: action.value,
                accessCredential: action.value === "NONE" ? null : state.intake.accessCredential,
            },
        };
    }
    return { ...state, [action.field]: action.value };
}
