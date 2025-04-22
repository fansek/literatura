import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

/**
 * @param {string} searchPath
 * @returns {{
    fileNames: string[];
    options: ts.CompilerOptions;
  }}
 */
const parseTsConfig = (searchPath) => {
  // we need to resolve project search path because TypeScript doesn't find
  // fileNames if we don't.
  const resolvedSearchPath = path.resolve(process.cwd(), searchPath);
  console.error('Search path: ' + resolvedSearchPath);

  const configFile = ts.findConfigFile(resolvedSearchPath, ts.sys.fileExists);
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
  return jsonConfigFileContent;
};

/**
 * @param {string | { fileNames: string[]; options: ts.CompilerOptions }} entry
 * @returns {Promise<import('./dir.js').Graph>}
 */
export const parseSingle = async (entry) => {
  const { fileNames, options } =
    typeof entry === 'string' ? parseTsConfig(entry) : entry;

  const host = ts.createCompilerHost(options);
  /**
   * @param {string} moduleName
   * @param {string} containingFile
   */
  const resolve = (moduleName, containingFile) =>
    ts.resolveModuleName(moduleName, containingFile, options, host)
      .resolvedModule?.resolvedFileName;

  const depsByFileName = await Promise.all(
    fileNames.map(async (fileName) => {
      console.error('Parsing entry ' + fileName);
      const sourceText = await fs.readFile(fileName, 'utf8');
      const source = ts.createSourceFile(
        fileName,
        sourceText,
        ts.ScriptTarget.Latest,
      );
      /** @type {Set<string>} */
      const deps = new Set();
      /**
       * @param {string} moduleName
       */
      const addDep = (moduleName) => {
        const resolvedFileName = resolve(moduleName, fileName);
        if (resolvedFileName != null) {
          deps.add(resolvedFileName);
        }
      };
      const nodeVisitor = (/** @type {ts.Node} */ node) => {
        if (
          ts.isImportDeclaration(node) &&
          ts.isStringLiteral(node.moduleSpecifier)
        ) {
          addDep(node.moduleSpecifier.text);
        } else if (
          ts.isCallExpression(node) &&
          (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
            (ts.isIdentifier(node.expression) &&
              node.expression.escapedText === 'require')) &&
          node.arguments.length === 1
        ) {
          const nodeArgument = node.arguments[0];
          if (ts.isStringLiteral(nodeArgument)) {
            addDep(nodeArgument.text);
          }
        } else if (
          ts.isExportDeclaration(node) &&
          node.moduleSpecifier &&
          ts.isStringLiteral(node.moduleSpecifier)
        ) {
          addDep(node.moduleSpecifier.text);
        }
        ts.forEachChild(node, nodeVisitor);
      };
      ts.forEachChild(source, nodeVisitor);
      return /** @type {[string, Set<string>]} */ ([fileName, deps]);
    }),
  );
  return new Map(depsByFileName);
};

/**
 * @param {string[]} entries
 * @returns {Promise<import('./dir.js').Graph>}
 */
export const parse = async (entries) => {
  const graphs = await Promise.all(entries.map(parseSingle));
  return new Map(graphs.flatMap((graph) => [...graph.entries()]));
};

export default parse;
