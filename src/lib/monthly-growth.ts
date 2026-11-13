const percent = new Intl.NumberFormat("es-AR", { style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" });

export function growthLabel(value: number | null | undefined) {
    return value == null ? "Sin base de comparación" : percent.format(value / 100);
}
