import buildWithTs from '../build/build-with-ts.js';
import { write } from '../store.js';

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
  const graph = await buildWithTs(tsconfigSearchPath);
  return write(graph, baseDir, storePath);
};

export default build;
