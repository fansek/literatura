import { lstat } from 'node:fs/promises';
import render from './render.js';
import { useStore } from './store.js';

/**
 * @param {string} tsconfigSearchPath
 * @param {string} baseDir a base dir path
 * @param {string} [storeFilename] a store filename
 */
const read = async (tsconfigSearchPath, baseDir, storeFilename) => {
  const buildStore = async () => {
    const build = (await import('./build.js')).default;
    return build(tsconfigSearchPath);
  };
  return useStore(buildStore, baseDir, storeFilename);
};

/**
 * @param {string} baseDir
 */
const checkBaseDir = async (baseDir) => {
  try {
    const stats = await lstat(baseDir);
    if (!stats.isDirectory()) {
      console.error(`Base is not a directory: ${baseDir}`);
      process.exit(1);
    }
  } catch (e) {
    console.error(`Error occurred while reading ${baseDir}: ${e}`);
    process.exit(1);
  }
};

/**
 * @param {string[]} entries
 * @param {{
 *   base?: string;
 *   tsconfig?: string;
 *   store?: string;
 *   node: string;
 *   edge: string;
 * }} options
 * @returns {Promise<void>}
 */
const literatura = async (
  entries,
  {
    base: baseDir = process.cwd(),
    tsconfig: tsconfigSearchPath = process.cwd(),
    store: storeFilename,
    node,
    edge,
  },
) => {
  await checkBaseDir(baseDir);

  const graph = await read(tsconfigSearchPath, baseDir, storeFilename);

  render(graph, entries, { node, edge, base: baseDir });
};

export default literatura;
