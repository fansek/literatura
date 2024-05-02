import * as path from 'node:path';
import setDefault from './set-default.js';

/**
 * @typedef {{ tail: string; head: string }} Edge
 * @typedef {{
 *    name: string;
 *    fullName: string;
 *    subnodes: Map<string, DirNode>;
 *    dependencies: Map<string, Map<string, Edge[]>>;
 * }} DirNode
 */

/**
 * @param {string} name
 * @param {string} fullName
 * @returns {DirNode}
 */
const newDirNode = (name, fullName) => ({
  name,
  fullName,
  subnodes: new Map(),
  dependencies: new Map(),
});

/**
 * @param {Edge[]} edges
 * @returns {string[]}
 */
const findNodes = (edges) => (
  [...new Set(edges.flatMap(({ tail, head }) => [tail, head]))]
);

/**
 * @param {Edge[]} edges
 * @param {'\\' | '/'} [pathSeparator]
 * @returns {DirNode}
 */
const formDirNode = (edges, pathSeparator = path.sep) => {
  const nodes = findNodes(edges);
  const dirNode = newDirNode('/', '/');
  nodes.forEach((node) => {
    let current = dirNode;
    node
      .split(pathSeparator)
      .forEach((name, index, vArray) => {
        const { subnodes } = current;
        let next = subnodes.get(name);
        if (next != null) {
          current = next;
        } else {
          next = newDirNode(
            name,
            vArray.slice(0, index + 1).join(pathSeparator),
          );
          subnodes.set(name, next);
          current = next;
        }
      });
  });
  /** @type {Map<string, Set<string>>} */
  const edgeSet = new Map();

  edges.forEach(({ tail, head }) => {
    let current = dirNode;
    const tailNodes = tail.split(pathSeparator);
    const headNodes = head.split(pathSeparator);
    tailNodes.some((tailNode, index) => {
      const headNode = headNodes[index];
      const nodesAreEqual = tailNode === headNode;
      if (nodesAreEqual) {
        current = /** @type {DirNode} */ (current.subnodes.get(tailNode));
      } else {
        const { dependencies } = current;
        let heads = edgeSet.get(tail);
        if (heads == null || !heads.has(head)) {
          if (heads == null) {
            heads = new Set();
            edgeSet.set(tail, heads);
          }
          heads.add(head);

          setDefault(
            setDefault(
              dependencies,
              tailNode,
              /** @type {Map<string, Edge[]>} */ (new Map()),
            ),
            headNodes[index],
            [],
          ).push({ tail, head });
        }
      }
      return !nodesAreEqual;
    });
  });
  return dirNode;
};

export default formDirNode;
