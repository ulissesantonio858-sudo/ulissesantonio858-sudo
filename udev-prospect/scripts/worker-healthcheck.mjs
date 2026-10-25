// Healthcheck do contentor do worker: o ficheiro de sinal de vida tem de ter menos de 60 s.
import fs from "node:fs";
import os from "node:os";
const f = process.env.WORKER_HEARTBEAT_FILE || `${os.tmpdir()}/udev-worker-heartbeat`;
try {
  const age = Date.now() - Number(fs.readFileSync(f, "utf8"));
  process.exit(age < 60_000 ? 0 : 1);
} catch { process.exit(1); }
