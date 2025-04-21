import * as path from 'node:path';
import setDefault from './set-default.js';

/**
 * @typedef {Map<string, Set<string>>} Graph
 * @typedef {{
 *    name: string;
 *    fullName: string;
 *    subnodes: Map<string, Dir>;
 *    dependencies: Map<string, Map<string, Graph>>;
 * }} Dir
 */

/**
 * @param {Dir} dir
 * @returns {Dir | undefined}
 */
export const findHighestNonTrivialDescendant = (dir) => {
  if (dir.subnodes.size > 1) {
    return dir;
  }
  if (dir.subnodes.size === 1) {
    return findHighestNonTrivialDescendant([...dir.subnodes.values()][0]);
  }
  return undefined;
};

/**
 * @param {string} name
 * @param {string} fullName
 * @returns {Dir}
 */
const newDir = (name, fullName) => ({
  name,
  fullName,
  subnodes: new Map(),
  dependencies: new Map(),
});

/**
 * @param {Graph} graph
 * @returns {string[]}
 */
const getNodes = (graph) => [...graph.keys()];

/**
 * @param {Graph} graph
 * @param {'\\' | '/'} [pathSeparator]
 * @returns {Dir}
 */
const formDir = (graph, pathSeparator = path.sep) => {
  const nodes = getNodes(graph);
  const dir = newDir('/', '/');
  nodes.forEach((node) => {
    let current = dir;
    node.split(pathSeparator).forEach((name, index, vArray) => {
      const { subnodes } = current;
      let next = subnodes.get(name);
      if (next == null) {
        next = newDir(name, vArray.slice(0, index + 1).join(pathSeparator));
        subnodes.set(name, next);
      }
      current = next;
    });
  });

  graph.forEach((heads, tail) => {
    const tailNodes = tail.split(pathSeparator);
    heads.forEach((head) => {
      let current = dir;
      const headNodes = head.split(pathSeparator);
      tailNodes.some((tailNode, index) => {
        const headNode = headNodes[index];
        const nodesAreEqual = tailNode === headNode;
        if (nodesAreEqual) {
          current = /** @type {Dir} */ (current.subnodes.get(tailNode));
        } else {
          const { dependencies } = current;

          setDefault(
            setDefault(
              setDefault(dependencies, tailNode, new Map()),
              headNodes[index],
              new Map(),
            ),
            tail,
            new Set(),
          ).add(head);
        }
        return !nodesAreEqual;
      });
    });
  });
  return dir;
};

export default formDir;
