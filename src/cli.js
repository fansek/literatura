import * as commander from 'commander';
import literatura from './literatura.js';

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
  .option('-w, --working-dir [working dir]', 'working directory');

program.parse();

const entries = program.args;
const options = program.opts();
const workingDir = options.workingDir;

literatura(entries, workingDir);
