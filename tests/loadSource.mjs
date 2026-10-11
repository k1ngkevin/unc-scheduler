import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const requirePackage = createRequire(
  new URL("../package.json", import.meta.url),
);

// Load the app's TypeScript and aliases without adding a separate test bundler.
export function sourceLoader(overrides = {}) {
  const cache = new Map();
  function load(filename) {
    let file = path.resolve(projectRoot, filename);
    if (!path.extname(file))
      file += fs.existsSync(`${file}.tsx`) ? ".tsx" : ".ts";
    if (cache.has(file)) return cache.get(file).exports;
    const loadedModule = { exports: {} };
    cache.set(file, loadedModule);
    const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
    }).outputText;
    function resolve(id) {
      if (Object.hasOwn(overrides, id)) return overrides[id];
      if (id.startsWith("@/")) return load(id.slice(2));
      if (id.startsWith(".")) return load(path.join(path.dirname(file), id));
      return requirePackage(id);
    }
    new Function("require", "module", "exports", compiled)(
      resolve,
      loadedModule,
      loadedModule.exports,
    );
    return loadedModule.exports;
  }
  return load;
}
