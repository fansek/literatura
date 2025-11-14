import { parseArgs } from 'node:util';
import { DEFAULT_STORE_PATH } from '../store.js';
import { DEFAULT_NODE_FORMAT, DEFAULT_EDGE_FORMAT } from '../render/render.js';

const options = /** @type {const} */ ({
  help: { type: 'boolean', short: 'h', description: 'print this help message' },
  build: { type: 'boolean', short: 'b', description: 'build literatura store' },
  store: {
    type: 'string',
    short: 's',
    default: DEFAULT_STORE_PATH,
    description: 'literatura store path',
    arg: 'path',
  },
  tsconfig: {
    type: 'string',
    short: 'x',
    description: 'use tsconfig to build literatura store',
    arg: 'path',
  },
  node: {
    type: 'string',
    short: 'n',
    default: DEFAULT_NODE_FORMAT,
    description: 'format nodes with provided pattern',
    arg: 'pattern',
  },
  edge: {
    type: 'string',
    short: 'e',
    default: DEFAULT_EDGE_FORMAT,
    description: 'format edges with provided pattern',
    arg: 'pattern',
  },
});

const DESC_PADDING = 24;

/**
 * @param {keyof typeof options} option
 */
const formatHelpForOption = (option) => {
  const o = options[option];
  const arg = o.type === 'string' ? ` <${o.arg ?? 'argument'}>` : '';
  const optionWithArg = `  -${o.short},--${option}${arg}`.padEnd(DESC_PADDING);
  const defaultInfo =
    'default' in o
      ? `\n${''.padEnd(DESC_PADDING)}[default: '${o.default}']`
      : '';
  return `${optionWithArg}${o.description}${defaultInfo}`;
};

const USAGE = `Usage: literatura [options] <path>...
       lit [options] <path>...

CLI to build topologically ordered literature from code with respect for code
directory structure.

Arguments:
${'  path'.padEnd(DESC_PADDING)}path entries for render function

Options:
${
  /** @type {(keyof typeof options)[]} */ (Object.keys(options))
    .map((option) => formatHelpForOption(option))
    .join('\n')
}

Formatting:
  %%: a raw %
  %n: newline
  %t: tab
  %5p: property p with min length 5 left aligned
  %-8p: property p with min length 8 right aligned

Formatting properties:
  s: source path for both node and edge display
  d: destination path for edge display
  w: number representing count of leaf edges for edge display
  c: component nested index calculated in componentization
  g: graph
`;

/**
 * @param {boolean} [success]
 */
const printUsage = (success) => {
  console.error(USAGE);
  process.exit(success ? 0 : 1);
};

const BASE_DIR = process.cwd();

/**
 * @typedef {import('./build.js').BuildProps} BuildProps
 * @typedef {import('./render.js').RenderProps} RenderProps
 * @param {string[]} [args]
 * @returns {{ mode: 'build' } & BuildProps | { mode: 'render' } & RenderProps}
 */
const parse = (args) => {
  try {
    const parsedArgs = parseArgs({
      args,
      options,
      allowPositionals: true,
      allowNegative: true,
    });
    if (parsedArgs.values.help) {
      return printUsage(true);
    }
    if (parsedArgs.values.build) {
      return {
        mode: /** @type {const} */ ('build'),
        baseDir: BASE_DIR,
        storePath: parsedArgs.values.store,
        tsconfigSearchPath: parsedArgs.values.tsconfig ?? process.cwd(),
      };
    }

    return {
      mode: /** @type {const} */ ('render'),
      baseDir: BASE_DIR,
      storePath: parsedArgs.values.store,
      entries: parsedArgs.positionals,
      nodeFormat: parsedArgs.values.node,
      edgeFormat: parsedArgs.values.edge,
    };
  } catch {
    return printUsage();
  }
};

export default parse;
