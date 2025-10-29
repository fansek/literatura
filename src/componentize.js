import graphlib from '@dagrejs/graphlib';
import { sort } from 'd3-array';

/**
 * @template M
 * @param {Map<string, M>} moduleGraph
 * @param {(module: M) => Iterable<string>} deps
 * @returns {string[][][]}
 */
export const componentizeModuleGraph = (moduleGraph, deps) => {
  const graph = graphlib.json.read({
    nodes: sort(moduleGraph.keys()).map((v) => ({ v })),
    edges: sort(moduleGraph, ([m]) => m).flatMap(([name, m]) =>
      sort(deps(m)).map((dep) => ({ v: name, w: dep })),
    ),
  });
  return graphlib.alg
    .components(graph)
    .map((c) => graph.filterNodes(c.includes.bind(c)))
    .map(graphlib.alg.tarjan);
};
