const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const sourceRoot = path.resolve(__dirname, '../../src');
const filenameFor = (request, parent) => {
  const filename = path.resolve(path.dirname(parent), request);
  return path.extname(filename) ? filename : filename + '.ts';
};

/** Load production TypeScript in Node, resolving imports relative to their own module. */
function createSourceLoader(substitutes = {}) {
  const entry = path.join(sourceRoot, 'index.ts');
  const replacements = new Map(Object.entries(substitutes).map(([request, value]) =>
    [request.startsWith('.') ? filenameFor(request, entry) : request, value]));
  const modules = new Map();

  function load(request, parent = entry) {
    const filename = request.startsWith('.') ? filenameFor(request, parent) : request;
    if (replacements.has(filename)) return replacements.get(filename);
    if (!request.startsWith('.')) return require(request);
    if (modules.has(filename)) return modules.get(filename).exports;
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    }).outputText;
    const mod = { exports: {} };
    modules.set(filename, mod);
    vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename })(
      dependency => load(dependency, filename), mod, mod.exports);
    return mod.exports;
  }

  return load;
}

module.exports = { createSourceLoader };
