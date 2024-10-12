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
  );

program.parse();

const entries = program.args;

const workingDir = process.cwd();

printDeps(entries, workingDir);
