export const MOTOROLA_XT_MAP: Readonly<Record<string, { model: string; xtList: readonly string[] }>> = {
    G22: { model: "MOTO G22", xtList: ["XT2231", "XT2231-1", "XT2231-2", "XT2231-3", "XT2231-5"] },
    G13: { model: "MOTO G13", xtList: ["XT2335", "XT2335-1", "XT2335-2"] },
    G14: { model: "MOTO G14", xtList: ["XT2341", "XT2341-1", "XT2341-2", "XT2341-3"] },
    G23: { model: "MOTO G23", xtList: ["XT2333", "XT2333-1", "XT2333-3"] },
    G52: { model: "MOTO G52", xtList: ["XT2221", "XT2221-1", "XT2221-2"] },
    G53: { model: "MOTO G53", xtList: ["XT2335-2", "XT2335"] },
    G54: { model: "MOTO G54", xtList: ["XT2343", "XT2343-1", "XT2343-2"] },
    G84: { model: "MOTO G84", xtList: ["XT2347", "XT2347-1", "XT2347-2"] },
    G30: { model: "MOTO G30", xtList: ["XT2129", "XT2129-1", "XT2129-2"] },
    G31: { model: "MOTO G31", xtList: ["XT2173", "XT2173-1", "XT2173-2", "XT2173-3"] },
    G32: { model: "MOTO G32", xtList: ["XT2235", "XT2235-2", "XT2235-3"] },
    G41: { model: "MOTO G41", xtList: ["XT2167", "XT2167-1"] },
    G42: { model: "MOTO G42", xtList: ["XT2233", "XT2233-1", "XT2233-2"] },
    G20: { model: "MOTO G20", xtList: ["XT2128", "XT2128-1", "XT2128-2"] },
    G10: { model: "MOTO G10", xtList: ["XT2127", "XT2127-1", "XT2127-2"] },
    G100: { model: "MOTO G100", xtList: ["XT2125", "XT2125-4"] },
    G200: { model: "MOTO G200", xtList: ["XT2175", "XT2175-1"] },
    E22: { model: "MOTO E22", xtList: ["XT2239", "XT2239-1", "XT2239-2", "XT2239-3"] },
    E20: { model: "MOTO E20", xtList: ["XT2155", "XT2155-1", "XT2155-3"] },
    E13: { model: "MOTO E13", xtList: ["XT2345", "XT2345-3", "XT2345-4"] },
    E32: { model: "MOTO E32", xtList: ["XT2227", "XT2227-1", "XT2227-2", "XT2227-3", "XT2227-4"] },
    E40: { model: "MOTO E40", xtList: ["XT2159", "XT2159-1", "XT2159-2"] },
    E7: { model: "MOTO E7", xtList: ["XT2095", "XT2095-1", "XT2095-2"] },
    E6S: { model: "MOTO E6S", xtList: ["XT2053", "XT2053-1", "XT2053-2"] },
    E6I: { model: "MOTO E6I", xtList: ["XT2053-5", "XT2053-6"] },
    EDGE30: { model: "MOTO EDGE 30", xtList: ["XT2203", "XT2203-1"] },
    EDGE40: { model: "MOTO EDGE 40", xtList: ["XT2303", "XT2303-1", "XT2303-2"] },
    ONEFUSION: { model: "MOTOROLA ONE FUSION", xtList: ["XT2073", "XT2073-2"] },
    ONEHYPER: { model: "MOTOROLA ONE HYPER", xtList: ["XT2027", "XT2027-1"] },
    ONEVISION: { model: "MOTOROLA ONE VISION", xtList: ["XT1970", "XT1970-1", "XT1970-3"] },
    ONEACTION: { model: "MOTOROLA ONE ACTION", xtList: ["XT2013", "XT2013-1", "XT2013-2"] },
};

export const LG_CHASSIS_MAP: Readonly<Record<string, { model: string; codes: readonly string[] }>> = {
    G2: { model: "LG G2", codes: ["D802", "D805"] },
    G4: { model: "LG G4", codes: ["H815", "H818"] },
    G5: { model: "LG G5", codes: ["H850"] },
    Q6: { model: "LG Q6", codes: ["M700", "M700TV"] },
    K5: { model: "LG K5", codes: ["X220", "X220DS"] },
    K40S: { model: "LG K40S", codes: ["LM-X430", "X430"] },
    OPTIMUSG: { model: "LG OPTIMUS G", codes: ["E970"] },
    OPTIMUSBLACK: { model: "LG OPTIMUS BLACK", codes: ["P970", "P975"] },
    SPIRIT: { model: "LG SPIRIT", codes: ["H422"] },
};

export function motorolaAliases(clean: string, compact: string): string[] {
    const aliases = new Set<string>([clean, compact]);
    const seriesMatch = clean.match(
        /^(?:MOTOROLA\s+)?(?:MOTO\s+)?([GEC]\s*\d{1,3}[A-Z]*(?:\s*(?:PLUS|PLAY|POWER|PRO|5G|S|I))?|EDGE\s*\d{1,2}(?:\s*(?:PRO|PLUS|FUSION|NEO))?|ONE\s*(?:FUSION|HYPER|ACTION|VISION)?)$/i,
    );
    if (seriesMatch) {
        const core = seriesMatch[1].toUpperCase().replace(/\s+/g, " ");
        const coreCompact = core.replace(/\s+/g, "");
        aliases.add(core);
        aliases.add(coreCompact);
        aliases.add(`MOTO ${core}`);
        aliases.add(`MOTO ${coreCompact}`);
        aliases.add(`MOTOROLA ${core}`);
        aliases.add(`MOTOROLA ${coreCompact}`);
        const entry = MOTOROLA_XT_MAP[coreCompact];
        if (entry) {
            aliases.add(entry.model);
            for (const xt of entry.xtList) aliases.add(xt);
        }
    }
    return [...aliases];
}

export function lgAliases(clean: string, compact: string): string[] {
    const aliases = new Set<string>([clean, compact]);
    aliases.add(`LG ${clean}`);
    aliases.add(`LG ${compact}`);
    const withoutLg = clean.replace(/^LG\s+/i, "");
    aliases.add(withoutLg);
    aliases.add(withoutLg.replace(/\s+/g, ""));
    for (const entry of Object.values(LG_CHASSIS_MAP)) {
        const entryCompact = entry.model.replace(/\s+/g, "");
        if (compact.includes(entryCompact) || compact === entryCompact.replace(/^LG/, "")) {
            aliases.add(entry.model);
            aliases.add(entry.model.replace(/^LG\s+/, ""));
            for (const code of entry.codes) aliases.add(code);
        }
    }
    return [...aliases];
}

export function huaweiAliases(clean: string, compact: string): string[] {
    const aliases = new Set<string>([clean, compact]);
    aliases.add(`HUAWEI ${clean}`);
    aliases.add(`HUAWEI ${compact}`);
    const withoutHuawei = clean.replace(/^HUAWEI\s+/i, "");
    aliases.add(withoutHuawei);
    aliases.add(withoutHuawei.replace(/\s+/g, ""));
    if (/^HONOR/i.test(withoutHuawei)) {
        aliases.add(withoutHuawei);
        aliases.add(`HUAWEI ${withoutHuawei}`);
    }
    return [...aliases];
}

export function xiaomiAliases(clean: string, compact: string): string[] {
    const aliases = new Set<string>([clean, compact]);
    aliases.add(`XIAOMI ${clean}`);
    aliases.add(`XIAOMI ${compact}`);
    const withoutXiaomi = clean.replace(/^XIAOMI\s+/i, "");
    aliases.add(withoutXiaomi);
    aliases.add(withoutXiaomi.replace(/\s+/g, ""));
    if (/^(?:REDMI|POCO|BLACKSHARK)/i.test(withoutXiaomi)) {
        aliases.add(withoutXiaomi);
        aliases.add(`XIAOMI ${withoutXiaomi}`);
    }
    return [...aliases];
}

export function samsungSeriesAliases(clean: string, compact: string): string[] {
    const aliases = new Set<string>([clean, compact]);

    // Serie A (e.g. A10, A22, A54, A03s, Galaxy A54 5G)
    const aMatch = compact.match(/^(?:GALAXY|SAMSUNG)?A0?(\d{1,2})([SE]|CORE|5G)?$/);
    if (aMatch) {
        const num = aMatch[1];
        const numPad = num.length === 1 ? `0${num}` : num;
        const variant = aMatch[2] ?? "";
        const isS = variant === "S";
        const is5G = variant === "5G";
        const baseName = `A${num}${variant}`;
        aliases.add(baseName);
        aliases.add(`GALAXY ${baseName}`);
        aliases.add(`SAMSUNG ${baseName}`);
        aliases.add(`A${num}`);
        aliases.add(`GALAXY A${num}`);
        if (isS) {
            aliases.add(`SM-A${numPad}7`);
            aliases.add(`SM-A${numPad}7M`);
            aliases.add(`SM-A${numPad}7F`);
        } else if (is5G) {
            aliases.add(`SM-A${numPad}6`);
            aliases.add(`SM-A${numPad}6B`);
            aliases.add(`SM-A${numPad}6E`);
        } else {
            aliases.add(`SM-A${numPad}5`);
            aliases.add(`SM-A${numPad}5M`);
            aliases.add(`SM-A${numPad}5F`);
            aliases.add(`SM-A${numPad}6`);
            aliases.add(`SM-A${numPad}6B`);
            aliases.add(`SM-A${numPad}6E`);
        }
        aliases.add(`SM-A${numPad}`);
        return [...aliases];
    }

    // Serie M (e.g. M10, M12, M13, M20, M31)
    const mMatch = compact.match(/^(?:GALAXY|SAMSUNG)?M0?(\d{1,2})([SE]|CORE|5G)?$/);
    if (mMatch) {
        const num = mMatch[1];
        const numPad = num.length === 1 ? `0${num}` : num;
        const baseName = `M${num}${mMatch[2] ?? ""}`;
        aliases.add(baseName);
        aliases.add(`GALAXY ${baseName}`);
        aliases.add(`SAMSUNG ${baseName}`);
        aliases.add(`SM-M${numPad}5`);
        aliases.add(`SM-M${numPad}5F`);
        aliases.add(`SM-M${numPad}`);
        return [...aliases];
    }

    // Serie S (e.g. S20, S21, S22, S23, S24)
    const sMatch = compact.match(/^(?:GALAXY|SAMSUNG)?S0?(\d{1,2})([A-Z0-9]*)$/);
    if (sMatch) {
        const num = sMatch[1];
        const suffix = sMatch[2] ?? "";
        const baseName = `S${num}${suffix ? ` ${suffix}` : ""}`;
        aliases.add(baseName);
        aliases.add(`GALAXY ${baseName}`);
        aliases.add(`SAMSUNG ${baseName}`);
        return [...aliases];
    }

    // Serie J (e.g. J1, J2, J4, J5, J6, J7, J8)
    const jMatch = compact.match(/^(?:GALAXY|SAMSUNG)?J0?(\d{1,2})([A-Z0-9]*)$/);
    if (jMatch) {
        const num = jMatch[1];
        const suffix = jMatch[2] ?? "";
        const baseName = `J${num}${suffix ? ` ${suffix}` : ""}`;
        aliases.add(baseName);
        aliases.add(`GALAXY ${baseName}`);
        aliases.add(`SAMSUNG ${baseName}`);
        aliases.add(`SM-J${num}00`);
        return [...aliases];
    }

    // Serie Note (e.g. Note 8, Note 9, Note 10, Note 20)
    const noteMatch = compact.match(/^(?:GALAXY|SAMSUNG)?NOTE0?(\d{1,2})([A-Z0-9]*)$/);
    if (noteMatch) {
        const num = noteMatch[1];
        const suffix = noteMatch[2] ?? "";
        const baseName = `NOTE ${num}${suffix ? ` ${suffix}` : ""}`;
        aliases.add(baseName);
        aliases.add(`GALAXY ${baseName}`);
        aliases.add(`SAMSUNG ${baseName}`);
        return [...aliases];
    }

    return [...aliases];
}
