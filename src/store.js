import { sort } from 'd3-array';
import fs from 'node:fs/promises';
import path from 'node:path';
import pkg from '../package.json' with { type: 'json' };

export const DEFAULT_STORE_FILENAME = '.literatura-store.json';
const PKG_VERSION = pkg.version;

/**
 * @param {string} baseDir a base dir path
 * @param {string} [storeFilename] a store filename
 */
const resolveStorePath = (baseDir, storeFilename) =>
  path.resolve(baseDir, storeFilename ?? DEFAULT_STORE_FILENAME);

/**
 * @param {unknown} storeObj
 * @param {string} baseDir a base dir path
 */
export const deserialize = (storeObj, baseDir) => {
  if (
    storeObj == null ||
    typeof storeObj !== 'object' ||
    !('version' in storeObj) ||
    !('files' in storeObj) ||
    !('refs' in storeObj)
  ) {
    return undefined;
  }
  const { version, files, refs } = storeObj;
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
 * @param {string} storePath
 * @param {string} baseDir a base dir path
 */
const read = async (storePath, baseDir) => {
  try {
    const storeFileContent = await fs.readFile(storePath, 'utf-8');
    const storeObj = /** @type {unknown} */ (JSON.parse(storeFileContent));
    return deserialize(storeObj, baseDir);
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
 * @param {string} storePath
 * @param {Map<string, Set<string>>} graph
 * @param {string} baseDir a base dir path
 */
const write = async (storePath, graph, baseDir) => {
  try {
    const storeObj = serialize(graph, baseDir);
    const storeFileContent = JSON.stringify(storeObj);
    await fs.writeFile(storePath, storeFileContent, 'utf-8');
  } catch {
    // no-op
  }
};

/**
 * @param {() => Promise<Map<string, Set<string>>>} makeGraph
 * @param {string} baseDir a base dir path
 * @param {string} [storeFilename] a store filename
 */
export const useStore = async (makeGraph, baseDir, storeFilename) => {
  const storePath = resolveStorePath(baseDir, storeFilename);
  const storedGraph = await read(storePath, baseDir);
  if (storedGraph != null) {
    console.error(`Store hit: ${storePath}`);
    return storedGraph;
  }
  const newGraph = await makeGraph();
  await write(storePath, newGraph, baseDir);
  console.error(`Store written: ${storePath}`);
  return newGraph;
};
