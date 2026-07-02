import assert from "node:assert/strict";
import test from "node:test";

import packageLock from "../../package-lock.json";

type LockPackage = {
    version?: string;
};

function getSharpVersionsFromLockfile() {
    return Object.entries(packageLock.packages as Record<string, LockPackage>)
        .filter(([packagePath]) => packagePath === "node_modules/sharp" || packagePath.endsWith("/node_modules/sharp"))
        .map(([, pkg]) => pkg.version)
        .filter((version): version is string => typeof version === "string");
}

test("uses a single sharp version to avoid duplicate libvips during builds", () => {
    const versions = [...new Set(getSharpVersionsFromLockfile())];

    assert.deepEqual(versions, ["0.34.5"]);
});
