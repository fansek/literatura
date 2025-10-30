import buildGraph from './build-graph.js';
import { write } from './store.js';

/**
 * @typedef {{
 *   baseDir: string;
 *   tsconfigSearchPath: string;
 *   storePath?: string;
 * }} BuildProps
 * @param {BuildProps} options
 */
const build = async ({
  baseDir,
  tsconfigSearchPath = process.cwd(),
  storePath,
}) => {
  const graph = await buildGraph(tsconfigSearchPath);
  return write(graph, baseDir, storePath);
};

export default build;
