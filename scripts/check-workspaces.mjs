import { access, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

const rootManifest = await readJson(join(repositoryRoot, "package.json"));
const workspacePaths = rootManifest.workspaces;

if (!Array.isArray(workspacePaths)) {
  throw new Error("The root package.json must define workspaces as an array.");
}

const errors = [];

for (const workspacePath of workspacePaths) {
  const manifest = await readJson(
    join(repositoryRoot, workspacePath, "package.json"),
  );

  for (const lockfile of ["package-lock.json", "npm-shrinkwrap.json"]) {
    const lockfilePath = join(repositoryRoot, workspacePath, lockfile);
    try {
      await access(lockfilePath);
      errors.push(
        `${workspacePath}/${lockfile} must not exist; use the repository-root package-lock.json`,
      );
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  if (workspacePath === "src") continue;

  for (const dependencyType of [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies",
  ]) {
    const dependencies = Object.keys(manifest[dependencyType] ?? {});
    if (dependencies.length > 0) {
      errors.push(
        `${workspacePath}: move ${dependencyType} (${dependencies.join(", ")}) to src/package.json`,
      );
    }
  }
}

if (errors.length > 0) {
  console.error("Workspace dependency policy failed:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    "Workspace dependency policy passed: dependencies are centralised in src/package.json with one root lockfile.",
  );
}
