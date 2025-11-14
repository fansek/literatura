import graphlib from '@dagrejs/graphlib';
import { max, sort } from 'd3-array';

/**
 * @param {unknown[]} arr
 * @param {number} index
 * @param {number} maxLength
 */
const formatIndex = (arr, index, maxLength) =>
  maxLength <= 1
    ? ''
    : (arr.length === 1 ? '' : String(index)).padStart(
        String(maxLength).length,
      );

/**
 * @template M
 * @param {Map<string, M>} moduleGraph
 * @param {(module: M) => Iterable<string>} deps
 */
export const componentize = (moduleGraph, deps) => {
  const graph = graphlib.json.read({
    nodes: sort(moduleGraph.keys()).map((v) => ({ v })),
    edges: sort(moduleGraph, ([m]) => m).flatMap(([name, m]) =>
      sort(deps(m)).map((dep) => ({ v: name, w: dep })),
    ),
  });
  const cs = graphlib.alg
    .components(graph)
    .map((c) => graph.filterNodes(c.includes.bind(c)))
    .map(graphlib.alg.tarjan);
  return cs.flatMap((sccs, ci) => {
    const fcil = cs.length;
    const fci = formatIndex(cs, ci + 1, fcil);
    return sccs.flatMap((ns, scci) => {
      const fsccil = max(cs, (sccs) => sccs.length) ?? 0;
      const fscci = formatIndex(sccs, scci + 1, fsccil);
      return ns.map((n, ni) => {
        const fnil = max(cs, (sccs) => max(sccs, (ns) => ns.length)) ?? 0;
        const fni = formatIndex(ns, ni + 1, fnil);
        const cni = `${fci}:${fscci}:${fni}`;
        return { cni, src: n };
      });
    });
  });
};
