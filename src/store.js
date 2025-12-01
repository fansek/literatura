import { sort } from 'd3-array';
import fs from 'node:fs/promises';
import path from 'node:path';
import PKG_VERSION from './version.js';

export const DEFAULT_STORE_PATH = '.literatura-store.json';

/**
 * @typedef {{ isRuntime?: boolean }} Ref
 * @typedef {{ refs: Map<string, Ref> }} Node
 * @typedef {Map<string, Node>} Store
 */

/**
 * @param {string} baseDir a base dir path
 * @param {string} [storePath] a store path
 */
const resolveStorePath = (baseDir, storePath) =>
  path.resolve(baseDir, storePath ?? DEFAULT_STORE_PATH);

/**
 * @param {unknown} storeObj
 * @param {string} baseDir a base dir path
 * @returns {Store | undefined}
 */
export const deserialize = (storeObj, baseDir) => {
  if (
    storeObj == null ||
    typeof storeObj !== 'object' ||
    !('version' in storeObj) ||
    !('files' in storeObj) ||
    !('refs' in storeObj) ||
    !('runtimeRefs' in storeObj)
  ) {
    return undefined;
  }
  const { version, files, refs, runtimeRefs } = storeObj;
  if (
    version !== PKG_VERSION ||
    !Array.isArray(files) ||
    !files.every((file) => typeof file === 'string') ||
    !Array.isArray(refs) ||
    !refs.every(
      (refGroup) =>
        Array.isArray(refGroup) &&
        refGroup.every((ref) => typeof ref === 'number'),
    ) ||
    !Array.isArray(runtimeRefs) ||
    !runtimeRefs.every(
      (refGroup) =>
        Array.isArray(refGroup) &&
        refGroup.every((ref) => typeof ref === 'number'),
    )
  ) {
    return undefined;
  }
  if (
    !refs.every(
      (refGroup) =>
        refGroup.length >= 1 &&
        refGroup.every((ref) => ref >= 0 && ref < files.length),
    ) ||
    !runtimeRefs.every(
      (refGroup) =>
        refGroup.length >= 1 &&
        refGroup.every((ref) => ref >= 0 && ref < files.length),
    )
  ) {
    return undefined;
  }
  const runtimeRefMap = new Map(
    runtimeRefs.map((refGroup) => [
      path.resolve(baseDir, files[refGroup[0]]),
      new Set(
        refGroup.slice(1).map((ref) => path.resolve(baseDir, files[ref])),
      ),
    ]),
  );
  return new Map(
    refs.map((refGroup) => {
      const node = path.resolve(baseDir, files[refGroup[0]]);
      const refs = new Map(
        refGroup.slice(1).map((ref) => {
          const r = path.resolve(baseDir, files[ref]);
          return [r, { isRuntime: runtimeRefMap.get(node)?.has(r) ?? false }];
        }),
      );
      return [node, { refs }];
    }),
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
 * @param {Store} store
 * @param {string} baseDir a base dir path
 */
export const serialize = (store, baseDir) => {
  const version = PKG_VERSION;
  const storeEntries = [...store].map(([file, refGroup]) => ({
    file: path.relative(baseDir, file),
    refGroup: [...refGroup.refs].map(([ref, { isRuntime }]) => ({
      name: path.relative(baseDir, ref),
      isRuntime,
    })),
  }));
  const files = sort(
    new Set([
      ...storeEntries.map(({ file }) => file),
      ...storeEntries.flatMap(({ refGroup }) =>
        refGroup.map(({ name }) => name),
      ),
    ]),
  );
  const fileMap = new Map(files.map((file, index) => [file, index]));
  const refs = sort(
    storeEntries.map(({ file, refGroup }) => [
      /** @type {number} */ (fileMap.get(file)),
      ...sort(
        refGroup.map(({ name }) => /** @type {number} */ (fileMap.get(name))),
      ),
    ]),
    ([file]) => file,
  );
  const runtimeRefs = sort(
    storeEntries.map(({ file, refGroup }) => [
      /** @type {number} */ (fileMap.get(file)),
      ...sort(
        refGroup
          .filter(({ isRuntime }) => isRuntime)
          .map(({ name }) => /** @type {number} */ (fileMap.get(name))),
      ),
    ]),
    ([file]) => file,
  );
  return { version, files, refs, runtimeRefs };
};

/**
 * @param {Store} store
 * @param {string} baseDir a base dir path
 * @param {string} [storePath]
 */
export const write = async (store, baseDir, storePath) => {
  try {
    const storeObj = serialize(store, baseDir);
    const storeFileContent = JSON.stringify(storeObj);
    const resolvedStorePath = resolveStorePath(baseDir, storePath);
    await fs.writeFile(resolvedStorePath, storeFileContent, 'utf-8');
    return { status: /** @type {const} */ ('fulfilled') };
  } catch (e) {
    return { status: /** @type {const} */ ('rejected'), reason: String(e) };
  }
};
