import { access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const managedConsumers = [
  "post-office-stub/src",
  "yoti-stub/src",
  "gov-notify-stub/src",
  "infra-l2-dynamo/src",
  "infra-l2-kms/src",
  "infra-l2-outbound-proxy/src",
];
const errors = [];

const exists = async (path) => {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
};

for (const required of ["src/package.json", "src/package-lock.json"]) {
  if (!(await exists(join(repositoryRoot, required)))) {
    errors.push(`${required} must exist as part of the canonical dependency tree.`);
  }
}

for (const forbidden of ["package.json", "package-lock.json", "npm-shrinkwrap.json"]) {
  if (await exists(join(repositoryRoot, forbidden))) {
    errors.push(`${forbidden} must not exist at the repository root.`);
  }
}

for (const consumer of managedConsumers) {
  for (const forbidden of ["package.json", "package-lock.json", "npm-shrinkwrap.json"]) {
    if (await exists(join(repositoryRoot, consumer, forbidden))) {
      errors.push(
        `${consumer}/${forbidden} must not exist; use src/package.json and src/package-lock.json.`,
      );
    }
  }
}

if (errors.length > 0) {
  console.error("Dependency layout policy failed:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  "Dependency layout policy passed: src owns the canonical manifest and lockfile.",
);
