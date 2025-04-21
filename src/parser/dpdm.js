import { createRequire } from 'node:module';
import * as path from 'node:path';
import { parseDependencyTree } from 'dpdm';

const require = createRequire(import.meta.url);

/**
 * @param {string[]} entries
 * @param {boolean} transform
 * @returns {Promise<import('../dir.js').Graph>}
 */
const parse = async (entries, transform) => {
  const depTree = await parseDependencyTree(entries, { transform });
  return new Map(
    Object.entries(depTree).map(([from, to]) => [
      path.resolve(from),
      new Set(
        (to ?? [])
          // ignore core modules
          .filter(({ request }) => require.resolve.paths(request) != null)
          .map(({ id }) => id)
          .filter((value) => value != null)
          .map((id) => path.resolve(id)),
      ),
    ]),
  );
};

export default parse;
