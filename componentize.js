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
  return graphlib.json.read({
    nodes: Array.from(subnodes.keys(), (v) => ({ v })),
    edges: [...dependencies]
      .flatMap(([v, ws]) => Array.from(ws.keys(), (w) => ({ v, w }))),
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
 * @param {string[][][]} cs
 * @returns {string[][][]}
 */
const sortComponents = (cs) => (
  sort(
    cs.map(
      (sccs) => sccs.map(
        (scc) => sort(scc),
      ),
    ),
  )
);

/**
 * @param {DirNode} node
 * @returns {string[][][]}
 */
const componentize = (node) => (
  sortComponents(componentizeGraph(convertToGraph(node)))
);

export default componentize;
