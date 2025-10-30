import { sort } from 'd3-array';
import fs from 'node:fs/promises';
import path from 'node:path';
import pkg from '../package.json' with { type: 'json' };

const PKG_VERSION = pkg.version;

export const DEFAULT_STORE_PATH = '.literatura-store.json';

/**
 * @param {string} baseDir a base dir path
 * @param {string} [storePath] a store path
 */
const resolveStorePath = (baseDir, storePath) =>
  path.resolve(baseDir, storePath ?? DEFAULT_STORE_PATH);

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
 * @param {string} baseDir a base dir path
 * @param {string} [storePath]
 */
export const read = async (baseDir, storePath) => {
  try {
    const resolvedStorePath = resolveStorePath(baseDir, storePath);
    const storeFileContent = await fs.readFile(resolvedStorePath, 'utf-8');
    const storeObj = /** @type {unknown} */ (JSON.parse(storeFileContent));
    const value = deserialize(storeObj, baseDir);
    if (value == null) {
      return {
        status: /** @type {const} */ ('rejected'),
        reason: 'Invalid store format',
      };
    }
    return { status: /** @type {const} */ ('fulfilled'), value };
  } catch (e) {
    return { status: /** @type {const} */ ('rejected'), reason: String(e) };
  }
};

/**
 * @param {Map<string, Set<string>>} graph
 * @param {string} baseDir a base dir path
 */
export const serialize = (graph, baseDir) => {
  const version = PKG_VERSION;
  const graphEntries = [...graph].map(([src, dsts]) => ({
    src: path.relative(baseDir, src),
    dsts: [...dsts].map((dst) => path.relative(baseDir, dst)),
  }));
  const files = sort(
    new Set([
      ...graphEntries.map(({ src }) => src),
      ...graphEntries.flatMap(({ dsts }) => dsts),
    ]),
  );
  const fileMap = new Map(files.map((file, index) => [file, index]));
  const refs = sort(
    graphEntries.map(({ src, dsts }) => [
      /** @type {number} */ (fileMap.get(src)),
      ...sort(dsts.map((dst) => /** @type {number} */ (fileMap.get(dst)))),
    ]),
    ([src]) => src,
  );
  return { version, files, refs };
};

/**
 * @param {Map<string, Set<string>>} graph
 * @param {string} baseDir a base dir path
 * @param {string} [storePath]
 */
export const write = async (graph, baseDir, storePath) => {
  try {
    const storeObj = serialize(graph, baseDir);
    const storeFileContent = JSON.stringify(storeObj);
    const resolvedStorePath = resolveStorePath(baseDir, storePath);
    await fs.writeFile(resolvedStorePath, storeFileContent, 'utf-8');
    return { status: /** @type {const} */ ('fulfilled') };
  } catch (e) {
    return { status: /** @type {const} */ ('rejected'), reason: String(e) };
  }
};
