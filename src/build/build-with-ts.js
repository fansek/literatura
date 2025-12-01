import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

/**
 * @param {string} searchPath
 */
const parseTsConfig = (searchPath) => {
  // we need to resolve project search path because TypeScript doesn't find
  // fileNames if we don't.
  const resolvedSearchPath = path.resolve(process.cwd(), searchPath);
  console.error(`Search path: ${resolvedSearchPath}`);

  const configFile = ts.sys.fileExists(resolvedSearchPath)
    ? resolvedSearchPath
    : ts.findConfigFile(resolvedSearchPath, ts.sys.fileExists);
  if (configFile == null) {
    console.error('Config file was not found.');
    process.exit(1);
  }
  console.error(`Config file: ${configFile}`);

  const unrecoverableConfigFileDiagnostics =
    /** @type {ts.Diagnostic[]} */ ([]);
  const jsonConfigFileContent = ts.getParsedCommandLineOfConfigFile(
    configFile,
    undefined,
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (d) => {
        unrecoverableConfigFileDiagnostics.push(d);
      },
    },
  );

  if (
    jsonConfigFileContent == null ||
    jsonConfigFileContent.errors.length > 0 ||
    unrecoverableConfigFileDiagnostics.length > 0
  ) {
    console.error(
      `Parsing config file content failed: ${[
        ...unrecoverableConfigFileDiagnostics,
        ...(jsonConfigFileContent?.errors ?? []),
      ]}`,
    );
    process.exit(1);
  }
  return jsonConfigFileContent;
};

/**
 * Builds literatura store.
 *
 * @param {string | ts.ParsedCommandLine} config search path or config file
 * @returns {Promise<import('../store.js').Store>}
 */
const buildWithTs = async (config) => {
  const { fileNames, options } =
    typeof config === 'string' ? parseTsConfig(config) : config;

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
      const sourceText = await fs.readFile(fileName, 'utf8');
      const source = ts.createSourceFile(
        fileName,
        sourceText,
        ts.ScriptTarget.Latest,
      );
      /** @type {Set<string>} */
      const allDeps = new Set();
      /** @type {Set<string>} */
      const runtimeDeps = new Set();
      /**
       * @param {string} moduleName
       * @param {boolean} [isTypeOnly]
       */
      const addDep = (moduleName, isTypeOnly = false) => {
        const resolvedFileName = resolve(moduleName, fileName);
        if (resolvedFileName != null) {
          allDeps.add(resolvedFileName);
          if (!isTypeOnly) {
            runtimeDeps.add(resolvedFileName);
          }
        }
      };
      const nodeVisitor = (/** @type {ts.Node} */ node) => {
        if (
          ts.isImportDeclaration(node) &&
          ts.isStringLiteral(node.moduleSpecifier)
        ) {
          addDep(
            node.moduleSpecifier.text,
            node.importClause?.phaseModifier === ts.SyntaxKind.TypeKeyword,
          );
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
          addDep(node.moduleSpecifier.text, node.isTypeOnly);
        }
        ts.forEachChild(node, nodeVisitor);
      };
      ts.forEachChild(source, nodeVisitor);
      return /** @type {[string, import('../store.js').Node]} */ ([
        fileName,
        {
          refs: new Map(
            [...allDeps].map(
              (ref) =>
                /** @type {const} */ ([
                  ref,
                  { isRuntime: runtimeDeps.has(ref) },
                ]),
            ),
          ),
        },
      ]);
    }),
  );
  return new Map(depsByFileName);
};

export default buildWithTs;
