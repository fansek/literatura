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
 * @param {string[]} nodes
 * @param {(node: string) => Iterable<string>} getRefs
 */
export const componentize = (nodes, getRefs) => {
  const sortedNodes = sort(nodes);
  const graph = graphlib.json.read({
    nodes: sortedNodes.map((v) => ({ v })),
    edges: sortedNodes.flatMap((node) =>
      sort(getRefs(node)).map((ref) => ({ v: node, w: ref })),
    ),
  });
  const cs = graphlib.alg
    .components(graph)
    .map((c) => graph.filterNodes(c.includes.bind(c)))
    .map(graphlib.alg.tarjan);

  const fcil = cs.length;
  const fsccil = max(cs, (sccs) => sccs.length) ?? 0;
  const fnil = max(cs, (sccs) => max(sccs, (ns) => ns.length)) ?? 0;
  return cs.flatMap((sccs, ci) => {
    const fci = formatIndex(cs, ci + 1, fcil);
    return sccs.flatMap((ns, scci) => {
      const fscci = formatIndex(sccs, scci + 1, fsccil);
      return ns.map((n, ni) => {
        const fni = formatIndex(ns, ni + 1, fnil);
        const cni = `${fci}:${fscci}:${fni}`;
        return { cni, src: n };
      });
    });
  });
};
