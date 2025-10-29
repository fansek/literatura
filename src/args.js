import { parseArgs } from 'node:util';

const options = /** @type {const} */ ({
  help: { type: 'boolean', short: 'h', description: 'print this help message' },
  tsconfig: {
    type: 'string',
    short: 'x',
    description: 'use tsconfig to build literatura store',
    arg: 'path',
  },
  node: {
    type: 'string',
    short: 'n',
    default: '%(src)s\t%(ci)s:%(scci)s:%(ni)s',
    description: 'format nodes with provided pattern',
    arg: 'pattern',
  },
  edge: {
    type: 'string',
    short: 'e',
    default: '%(src)s\t%(dst)s\t%(weight)s',
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
${'  path'.padEnd(DESC_PADDING)}TSConfig search paths for dependency tree traversal

Options:
${
  /** @type {(keyof typeof options)[]} */ (Object.keys(options))
    .map((option) => formatHelpForOption(option))
    .join('\n')
}
`;

/**
 * @param {boolean} [success]
 */
const printUsage = (success) => {
  console.error(USAGE);
  process.exit(success ? 0 : 1);
};

/**
 * @param {string[] | undefined} [args]
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

    return { entries: parsedArgs.positionals, options: parsedArgs.values };
  } catch {
    return printUsage();
  }
};

export default parse;
