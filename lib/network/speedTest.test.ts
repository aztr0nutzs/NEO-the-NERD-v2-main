import { strict as assert } from "node:assert";
import { calculateJitterMs, calculateMbps } from "./speedTest";

assert.equal(calculateMbps(1_000_000, 1000).toFixed(3), "8.000");
assert.equal(Number(calculateJitterMs([10, 10, 10]).toFixed(3)), 0);
assert.ok(calculateJitterMs([10, 20, 30]) > 0);
console.log("speedTest logic checks passed");
