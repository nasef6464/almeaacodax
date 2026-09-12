import { execSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const serverDir = path.join(root, "server");

try {
  execSync("npm run simulate:smart-classroom", {
    cwd: serverDir,
    stdio: "inherit",
  });
  process.exit(0);
} catch (err) {
  process.exit(err.status || 1);
}
