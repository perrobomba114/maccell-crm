import type { ChatSession } from "./chat-repository";
import type { CerebroPublicSource } from "./types";

export type CerebroUiState = {
    sessions: ChatSession[];
    activeSessionId: string | null;
    historyOpen: boolean;
    sourcePanelOpen: boolean;
    activeSource: CerebroPublicSource | null;
};

export type CerebroUiAction =
    | { type: "sessions-loaded"; sessions: ChatSession[] }
    | { type: "session-selected"; session: ChatSession }
    | { type: "session-created"; session: ChatSession }
    | { type: "session-deleted"; sessionId: string }
    | { type: "toggle-history" }
    | { type: "close-history" }
    | { type: "open-source"; source: CerebroPublicSource }
    | { type: "close-source" };

export const cerebroInitialState: CerebroUiState = {
    sessions: [],
    activeSessionId: null,
    historyOpen: false,
    sourcePanelOpen: false,
    activeSource: null,
};

export function cerebroUiReducer(state: CerebroUiState, action: CerebroUiAction): CerebroUiState {
    switch (action.type) {
        case "sessions-loaded":
            return { ...state, sessions: action.sessions };
        case "session-selected":
            return {
                ...state,
                activeSessionId: action.session.id,
                historyOpen: false,
                sourcePanelOpen: false,
                activeSource: null,
            };
        case "session-created":
            return {
                ...state,
                sessions: [action.session, ...state.sessions.filter((item) => item.id !== action.session.id)],
                activeSessionId: action.session.id,
                historyOpen: false,
            };
        case "session-deleted":
            return {
                ...state,
                sessions: state.sessions.filter((item) => item.id !== action.sessionId),
                activeSessionId: state.activeSessionId === action.sessionId ? null : state.activeSessionId,
            };
        case "toggle-history":
            return { ...state, historyOpen: !state.historyOpen };
        case "close-history":
            return { ...state, historyOpen: false };
        case "open-source":
            return { ...state, activeSource: action.source, sourcePanelOpen: true };
        case "close-source":
            return { ...state, activeSource: null, sourcePanelOpen: false };
    }
}
