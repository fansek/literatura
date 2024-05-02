import graphlib from '@dagrejs/graphlib';
import { sort } from 'd3-array';

/**
 * @typedef {import('./dir-node.js').DirNode} DirNode
 */

/**
 * @param {DirNode} dirNode
 * @returns {graphlib.Graph}
 */
const convertToGraph = (dirNode) => {
  const { subnodes, dependencies } = dirNode;
  // sorting has influence on the final topological ordering when breaking ties
  return graphlib.json.read({
    nodes: sort(subnodes.keys()).map((v) => ({ v })),
    edges: (
      sort(dependencies, ([v]) => v)
        .flatMap(
          ([v, ws]) => sort(ws.keys()).map((w) => ({ v, w })),
        )
    ),
  });
};

/**
 * @param {graphlib.Graph} graph
 * @returns {string[][][]}
 */
const componentizeGraph = (graph) => (
  graphlib.alg
    .components(graph)
    .map((c) => graph.filterNodes(c.includes.bind(c)))
    .map(graphlib.alg.tarjan)
);

/**
 * @param {DirNode} node
 * @returns {string[][][]}
 */
const componentize = (node) => componentizeGraph(convertToGraph(node));

export default componentize;
