import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import * as commander from 'commander';

const { program } = commander;
program
  .name('hello-ts')
  .description('Testik')
  .argument('[entries...]', 'entries for dependency tree traversal');

program.parse();

const entries = program.args;
console.error('Entries: ' + entries);

const configFile = ts.findConfigFile(process.cwd(), ts.sys.fileExists);
if (configFile == null) {
  console.error('Config file was not found.');
  process.exit(1);
}
console.error('Config file: ' + configFile);

const maybeConfig = ts.readConfigFile(configFile, ts.sys.readFile);
if (maybeConfig.error) {
  console.error('Reading config file failed: ' + maybeConfig.error);
  process.exit(1);
}
console.error('Reading config file succeeded.');

const jsonConfigFileContent = ts.parseJsonConfigFileContent(
  maybeConfig.config,
  ts.sys,
  path.dirname(configFile),
);
if (jsonConfigFileContent.errors.length > 0) {
  console.error(
    'Parsing config file content failed: ' + jsonConfigFileContent.errors,
  );
  process.exit(1);
}
console.error('Parsing config file content succeeded.');

const fileNames =
  entries.length > 0 ? entries : jsonConfigFileContent.fileNames;
console.error('Files: ' + fileNames);

const compilerOptions = jsonConfigFileContent.options;
const host = ts.createCompilerHost(compilerOptions);

/**
 * @param {string} moduleName
 * @param {string} containingFile
 */
const resolve = (moduleName, containingFile) =>
  ts.resolveModuleName(moduleName, containingFile, compilerOptions, host)
    .resolvedModule;

Promise.all(
  fileNames.map(async (fileName) => {
    console.error('Parsing entry ' + fileName);
    const sourceText = await fs.readFile(fileName, 'utf8');
    const source = ts.createSourceFile(
      fileName,
      sourceText,
      ts.ScriptTarget.Latest,
    );
    /** @type {(ts.ResolvedModuleFull | undefined)[]} */
    const deps = [];
    const nodeVisitor = (/** @type {ts.Node} */ node) => {
      if (
        ts.isImportDeclaration(node) &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        deps.push(resolve(node.moduleSpecifier.text, fileName));
      } else if (
        ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) &&
            node.expression.escapedText === 'require')) &&
        node.arguments.length === 1
      ) {
        const nodeArgument = node.arguments[0];
        if (ts.isStringLiteral(nodeArgument)) {
          deps.push(resolve(nodeArgument.text, fileName));
        }
      } else if (
        ts.isExportDeclaration(node) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        deps.push(resolve(node.moduleSpecifier.text, fileName));
      }
      ts.forEachChild(node, nodeVisitor);
    };
    ts.forEachChild(source, nodeVisitor);
    return { fileName, deps };
  }),
).then((deps) => {
  console.log(JSON.stringify(deps, undefined, 2));
});
