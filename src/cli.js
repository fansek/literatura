import * as commander from 'commander';
import printDeps from './literatura.js';

const { program } = commander;
program
  .name('literatura')
  .description(
    'CLI to build topologically ordered literature from code ' +
      'with respect for code directory structure.',
  )
  .argument(
    '<entries...>',
    'entries for dependency tree traversal (see manual for dpdm)',
  )
  .option('-T, --transform');

program.parse();

const entries = program.args;
const options = program.opts();

const workingDir = process.cwd();

printDeps(entries, workingDir, Boolean(options.transform));
