export type DiagnosisProviderAvailability = {
    hasGroq: boolean;
    hasLocal: boolean;
    hasOpenRouter: boolean;
    hasEmpero: boolean;
};

export function buildDiagnosisProviderOrder(input: DiagnosisProviderAvailability): string[] {
    return [
        input.hasGroq ? "groq" : null,
        input.hasLocal ? "local" : null,
        input.hasOpenRouter ? "openrouter" : null,
        input.hasEmpero ? "empero" : null,
    ].filter((provider): provider is string => provider !== null);
}
