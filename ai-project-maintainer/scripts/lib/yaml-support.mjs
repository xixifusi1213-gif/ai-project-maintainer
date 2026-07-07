import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export function formatMissingYamlDependencyError(error) {
  return new Error(
    "The local ai-project-maintainer skill is missing the yaml dependency. " +
    "Use npx ai-project-maintainer for the packaged CLI, or run npm install in the package checkout before using direct local scripts.",
    { cause: error },
  );
}

function loadYaml() {
  try {
    return require("yaml");
  } catch (error) {
    if (error?.code === "MODULE_NOT_FOUND" && /(?:^|['"`\s])yaml(?:['"`\s]|$)/i.test(error.message || "")) {
      throw formatMissingYamlDependencyError(error);
    }
    throw error;
  }
}

export function parseYaml(text) {
  return loadYaml().parse(text);
}

export function stringifyYaml(value) {
  return loadYaml().stringify(value);
}
