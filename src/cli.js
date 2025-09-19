import * as commander from 'commander';
import literatura from './literatura.js';

/**
 * @param {unknown} value
 */
const maybeString = (value) => (value == null ? undefined : String(value));

const { program } = commander;
program
  .name('literatura')
  .description(
    'CLI to build topologically ordered literature from code ' +
      'with respect for code directory structure.',
  )
  .argument(
    '[entries...]',
    'TSConfig search path entries for dependency tree traversal',
  )
  .option('--tsconfig [TSConfig]', 'TSConfig search path, defaults to cwd')
  .option('--format [format]', 'format (values: md, plain, graph)')
  .option('--cache', 'cache');

program.parse();

const entries = program.args;
const options = program.opts();
const tsconfig = maybeString(options.tsconfig);
const format = maybeString(options.format);
const cache = Boolean(options.cache);

await literatura(entries, { tsconfig, format, cache });
