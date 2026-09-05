export type VerifiedIdentityInput = { brand: string; model: string; boardCode: string; revision: string; aliases: string[] };

function requiredText(value: unknown, field: string, maximum = 120): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maximum) throw new Error(`${field} es obligatorio y admite hasta ${maximum} caracteres`);
  return value.trim();
}

export function parseVerifiedIdentity(value: unknown): VerifiedIdentityInput {
  if (!value || typeof value !== "object") throw new Error("Datos de identidad inválidos");
  const input = value as Record<string, unknown>;
  if (input.verified !== true) throw new Error("La verificación debe confirmarse explícitamente");
  if (input.aliases !== undefined && !Array.isArray(input.aliases)) throw new Error("Los alias deben ser una lista");
  if (Array.isArray(input.aliases) && input.aliases.length > 20) throw new Error("Se admiten hasta 20 alias");
  return {
    brand: requiredText(input.brand, "Marca"), model: requiredText(input.model, "Modelo"),
    boardCode: requiredText(input.boardCode, "Código de placa"), revision: requiredText(input.revision, "Revisión"),
    aliases: (input.aliases ?? []).map((alias) => requiredText(alias, "Alias")),
  };
}
