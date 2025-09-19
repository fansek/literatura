import { useCache } from './cache.js';

/**
 * @param {string} tsconfigSearchPath
 * @param {string} baseDir a base dir path
 * @param {boolean} [cacheEnabled]
 */
export const read = async (tsconfigSearchPath, baseDir, cacheEnabled) => {
  const makeGraph = async () => {
    const parse = (await import('./parser.js')).default;
    return parse(tsconfigSearchPath);
  };
  return cacheEnabled ? useCache(makeGraph, baseDir) : makeGraph();
};

export default read;
