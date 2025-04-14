import { createRequire } from 'node:module';
import * as path from 'node:path';
import { parseDependencyTree } from 'dpdm';
import formDirNode from './dir-node.js';
import renderMarkdown from './view/tree/markdown.js';

const require = createRequire(import.meta.url);

/**
 * @typedef {import('./dir-node.js').DirNode} DirNode
 * @typedef {DirNode['dependencies']} Dependencies
 * @typedef {import('./dir-node.js').Edge} Edge
 */

/**
 * @param {string[]} entries
 * @param {string} workingDir
 * @param {boolean} transform
 * @returns {Promise<void>}
 */
const printDeps = async (entries, workingDir, transform) => {
  const depTree = await parseDependencyTree(entries, { transform });
  const edges = Object.entries(depTree).flatMap(([from, to]) =>
    (to ?? [])
      // ignore core modules
      .filter(({ request }) => require.resolve.paths(request) != null)
      .map(({ id }) => id)
      .filter((value) => value != null)
      .map((id) => ({ tail: path.resolve(from), head: path.resolve(id) })),
  );
  const dirNode = formDirNode(edges);
  console.log(renderMarkdown(dirNode, workingDir));
};

export default printDeps;
