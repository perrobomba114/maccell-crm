type VoucherRecoveryService = {
    getLastVoucher: (salesPoint: number, voucherType: number) => Promise<{ cbteNro?: number }>;
    getVoucherInfo: (
        voucherNumber: number,
        salesPoint: number,
        voucherType: number
    ) => Promise<{ codAutorizacion?: string; fchVto?: string } | null>;
};

export async function recoverAuthorizedVoucher(
    service: VoucherRecoveryService,
    salesPoint: number,
    voucherType: number,
    expectedCae: string
) {
    const last = await service.getLastVoucher(salesPoint, voucherType);
    const voucherNumber = last.cbteNro ?? 0;
    if (voucherNumber <= 0) throw new Error("ARCA no devolvió un último comprobante válido.");

    const voucher = await service.getVoucherInfo(voucherNumber, salesPoint, voucherType);
    if (!voucher || voucher.codAutorizacion !== expectedCae) {
        throw new Error("El último comprobante de ARCA no coincide con el CAE autorizado.");
    }
    if (!voucher.fchVto) throw new Error("ARCA no devolvió el vencimiento del CAE autorizado.");

    return { voucherNumber, caeExpiresAt: voucher.fchVto };
}
