import { lstat } from 'node:fs';
import formDir from './dir.js';
import read from './reader.js';

/**
 * @typedef {{
 *   base?: string;
 *   tsconfig?: string;
 *   format?: string;
 *   cache?: boolean;
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
    format,
    cache: cacheEnabled,
  },
) => {
  lstat(baseDir, (err, stats) => {
    if (err != null || !stats.isDirectory()) {
      console.error(`Base is not a directory: ${baseDir}`);
      process.exit(1);
    }
  });

  const graph = await read(tsconfigSearchPath, baseDir, cacheEnabled);
  if (format === 'graph') {
    const renderGraph = (await import('./view/graph.js')).default;
    renderGraph(graph, baseDir);
    return;
  }
  const dir = formDir(graph);

  if (format === 'md') {
    const renderMarkdown = (await import('./view/tree/markdown.js')).default;
    renderMarkdown(dir, baseDir);
    return;
  }

  const renderPlain = (await import('./view/tree/plain.js')).default;
  renderPlain(dir, baseDir);
};

export default literatura;
