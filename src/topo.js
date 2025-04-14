import { InternSet, rollup } from 'd3-array';

/**
 * @template N, E
 * @typedef {{
 *    nodes: N[];
 *    edges: E[];
 *    tail: (e: E) => N;
 *    head: (e: E) => N
 * }} Graph<N, E>
 */

/**
 * Flatten edges
 *
 * @template N, E
 * @param {Map<N, N[]>} edges
 * @param {(tail: N, head: N) => E} formEdge
 * @returns {E[]}
 */
export const flatten = (edges, formEdge) =>
  [...edges].flatMap(([tail, heads]) =>
    heads.map((head) => formEdge(tail, head)),
  );

/**
 * Reverse edges
 *
 * @template N
 * @param {Map<N, N[]>} edges
 * @returns {Map<N, N[]>}
 */
export const reverse = (edges) =>
  rollup(
    [...edges].flatMap(([tail, heads]) =>
      heads.map((head) => ({ tail, head })),
    ),
    (tails) => tails.map(({ tail }) => tail),
    ({ head }) => head,
  );

/**
 * @param {{readonly size: number} | undefined | null} value
 */
const getSize = (value) => (value == null ? 0 : value.size);

/**
 * Modified Kahn’s algorithm for Topological Sorting
 *
 * @template N, E
 * @param {Graph<N, E>} graph
 */
const topo = ({ nodes, edges, tail: getTail, head: getHead }) => {
  const ns = new InternSet(nodes);
  const es = edges.filter((e) => ns.has(getTail(e)) && ns.has(getHead(e)));
  const headsByTail = rollup(es, (g) => new InternSet(g.map(getHead)), getTail);
  const tailsByHead = rollup(es, (g) => new InternSet(g.map(getTail)), getHead);
  /** @type {N[]} */
  const result = [];
  const queue = nodes.filter((n) => getSize(headsByTail.get(n)) === 0);
  while (true) {
    if (queue.length === 0) {
      return result;
    }
    const n = /** @type {N} */ (queue.shift());
    result.push(n);
    const ts = tailsByHead.get(n) ?? [];
    tailsByHead.delete(n);
    ts.forEach((t) => {
      const hs = headsByTail.get(t);
      hs?.delete(n);
      if (getSize(hs) === 0) {
        queue.push(n);
      }
    });
  }
};

export default topo;
