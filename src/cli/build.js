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
  const store = await buildWithTs(tsconfigSearchPath);
  return write(store, baseDir, storePath);
};

export default build;
