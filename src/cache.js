import { sort } from 'd3-array';
import fs from 'node:fs/promises';
import path from 'node:path';
import pkg from '../package.json' with { type: 'json' };

const DEFAULT_CACHE_FILENAME = '.literatura-cache.json';
const PKG_VERSION = pkg.version;

/**
 * @param {string} baseDir a base dir path
 */
const getCachePath = (baseDir) => path.join(baseDir, DEFAULT_CACHE_FILENAME);

/**
 * @param {unknown} cacheObj
 * @param {string} baseDir a base dir path
 */
export const deserialize = (cacheObj, baseDir) => {
  if (
    cacheObj == null ||
    typeof cacheObj !== 'object' ||
    !('version' in cacheObj) ||
    !('files' in cacheObj) ||
    !('refs' in cacheObj)
  ) {
    return undefined;
  }
  const { version, files, refs } = cacheObj;
  if (
    version !== PKG_VERSION ||
    !Array.isArray(files) ||
    !files.every((file) => typeof file === 'string') ||
    !Array.isArray(refs) ||
    !refs.every(
      (moduleRefs) =>
        Array.isArray(moduleRefs) &&
        moduleRefs.every((ref) => typeof ref === 'number'),
    )
  ) {
    return undefined;
  }
  if (
    !refs.every(
      (moduleRefs) =>
        moduleRefs.length >= 1 &&
        moduleRefs.every((ref) => ref >= 0 && ref < files.length),
    )
  ) {
    return undefined;
  }
  return new Map(
    refs.map((moduleRefs) => [
      path.resolve(baseDir, files[moduleRefs[0]]),
      new Set(
        moduleRefs.slice(1).map((ref) => path.resolve(baseDir, files[ref])),
      ),
    ]),
  );
};

/**
 * @param {string} cachePath
 * @param {string} baseDir a base dir path
 */
const read = async (cachePath, baseDir) => {
  try {
    const cacheFileContent = await fs.readFile(cachePath, 'utf-8');
    const cacheObj = /** @type {unknown} */ (JSON.parse(cacheFileContent));
    return deserialize(cacheObj, baseDir);
  } catch {
    return undefined;
  }
};

/**
 * @param {Map<string, Set<string>>} graph
 * @param {string} baseDir a base dir path
 */
export const serialize = (graph, baseDir) => {
  const version = PKG_VERSION;
  const graphEntries = [...graph].map(([tail, heads]) => ({
    tail: path.relative(baseDir, tail),
    heads: [...heads].map((head) => path.relative(baseDir, head)),
  }));
  const files = sort(
    new Set([
      ...graphEntries.map(({ tail }) => tail),
      ...graphEntries.flatMap(({ heads }) => heads),
    ]),
  );
  const fileMap = new Map(files.map((file, index) => [file, index]));
  const refs = sort(
    graphEntries.map(({ tail, heads }) => [
      /** @type {number} */ (fileMap.get(tail)),
      ...sort(heads.map((head) => /** @type {number} */ (fileMap.get(head)))),
    ]),
    ([tail]) => tail,
  );
  return { version, files, refs };
};

/**
 * @param {string} cachePath
 * @param {Map<string, Set<string>>} graph
 * @param {string} baseDir a base dir path
 */
const write = async (cachePath, graph, baseDir) => {
  try {
    const cacheObj = serialize(graph, baseDir);
    const cacheFileContent = JSON.stringify(cacheObj);
    await fs.writeFile(cachePath, cacheFileContent, 'utf-8');
  } catch {
    // no-op
  }
};

/**
 * @param {() => Promise<Map<string, Set<string>>>} makeGraph
 * @param {string} baseDir a base dir path
 */
export const useCache = async (makeGraph, baseDir) => {
  const cachePath = getCachePath(baseDir);
  const cachedGraph = await read(cachePath, baseDir);
  if (cachedGraph != null) {
    console.error(`Cache hit: ${cachePath}`);
    return cachedGraph;
  }
  const newGraph = await makeGraph();
  await write(cachePath, newGraph, baseDir);
  console.error(`Cache written: ${cachePath}`);
  return newGraph;
};
