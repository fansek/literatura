import { lstat } from 'node:fs';
import { resolve } from 'node:path';
import renderPlain from './render/plain.js';
import renderEntries from './render/entry.js';
import { useStore } from './store.js';

/**
 * @param {string} tsconfigSearchPath
 * @param {string} baseDir a base dir path
 */
const read = async (tsconfigSearchPath, baseDir) => {
  const buildStore = async () => {
    const build = (await import('./build.js')).default;
    return build(tsconfigSearchPath);
  };
  return useStore(buildStore, baseDir);
};

/**
 * @typedef {{
 *   base?: string;
 *   tsconfig?: string | undefined;
 *   node: string;
 *   edge: string;
 * }} Options
 */

/**
 * @param {string[]} entries
 * @param {Options} options
 * @returns {Promise<void>}
 */
const literatura = async (
  entries,
  {
    base: baseDir = process.cwd(),
    tsconfig: tsconfigSearchPath = process.cwd(),
    node,
    edge,
  },
) => {
  lstat(baseDir, (err, stats) => {
    if (err != null || !stats.isDirectory()) {
      console.error(`Base is not a directory: ${baseDir}`);
      process.exit(1);
    }
  });

  const graph = await read(tsconfigSearchPath, baseDir);

  if (entries.length === 0) {
    renderPlain(graph, baseDir);
    return;
  }

  const resolvedEntries = entries.map((entry) => resolve(baseDir, entry));
  renderEntries(graph, resolvedEntries, { node, edge });
};

export default literatura;
