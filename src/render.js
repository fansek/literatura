import path from 'node:path';
import { InternMap, rollup, sort } from 'd3-array';
import { sprintf } from 'sprintf-js';
import { componentizeModuleGraph } from './componentize.js';

/**
 * @param {Map<string, Set<string>>} graph
 * @param {string} baseDir a base dir path
 */
const renderPlain = (graph, baseDir) => {
  sort(graph, ([k]) => k).forEach(([k, vs]) => {
    if (vs.size === 0) {
      return;
    }
    const kFormatted = path.relative(baseDir, k);
    sort(vs).forEach((v) =>
      process.stdout.write(`${kFormatted}\t${path.relative(baseDir, v)}\n`),
    );
  });
};

/**
 * @param {string} tail an edge tail
 * @param {string} head an edge head
 */
const findLowestCommonAncestor = (tail, head) => {
  const tailComponents = tail.split(path.sep);
  const headComponents = head.split(path.sep);
  const i = tailComponents.findIndex(
    (value, index) => value !== headComponents[index],
  );
  return (
    (i === -1 ? tailComponents : tailComponents.slice(0, i)).join(path.sep) ||
    path.sep
  );
};

/**
 * @param {string} base
 * @param {string} child
 */
const getHighestComponent = (base, child) => {
  const rel = path.relative(base, child);
  const i = rel.search(path.sep);
  return i === -1 ? rel : rel.slice(0, i + 1);
};

/**
 * @param {Map<string, Map<string, number>>} graph
 * @param {string} format
 */
const renderNodes = (graph, format) => {
  const components = componentizeModuleGraph(graph, (m) => m.keys());
  components.forEach((c, ci) => {
    c.forEach((scc, scci) => {
      scc.forEach((src, ni) =>
        process.stdout.write(sprintf(format, { src, ci, scci, ni }) + '\n'),
      );
    });
  });
};

/**
 * @param {Map<string, Map<string, number>>} graph
 * @param {string} format
 */
const renderEdges = (graph, format) => {
  sort([...graph], ([tail]) => tail).forEach(([src, dsts]) =>
    sort(dsts, ([head]) => head).forEach(([dst, weight]) => {
      return process.stdout.write(sprintf(format, { src, dst, weight }) + '\n');
    }),
  );
};

/**
 * @param {Map<string, Set<string>>} graph
 * @param {string[]} entries
 * @param {{ node: string; edge: string; base: string }} options
 */
const renderEntries = (graph, entries, options) => {
  const resolvedEntries = entries.map((entry) =>
    path.resolve(options.base, entry),
  );
  const entrySet = new Set(resolvedEntries);
  const edges = [...graph].flatMap(([tail, heads]) =>
    [...heads].flatMap((head) => {
      const lca = findLowestCommonAncestor(tail, head);
      return entrySet.has(lca) ? [{ tail, head, lca }] : [];
    }),
  );
  const dirs = rollup(
    edges,
    (edgesByLCA) =>
      rollup(
        edgesByLCA,
        (edgesByTail) =>
          rollup(
            edgesByTail,
            (edgesByHead) => edgesByHead.length,
            ({ head, lca }) => getHighestComponent(lca, head),
          ),
        ({ tail, lca }) => getHighestComponent(lca, tail),
      ),
    ({ lca }) => lca,
  );

  resolvedEntries.forEach((entry) => {
    process.stdout.write(`${entry}\n`);
    const entryGraph = dirs.get(entry) ?? new InternMap();
    renderNodes(entryGraph, options.node);
    renderEdges(entryGraph, options.edge);
  });
};

/**
 * @param {Map<string, Set<string>>} graph
 * @param {string[]} entries
 * @param {{ node: string; edge: string; base: string }} options
 */
const render = (graph, entries, options) => {
  if (entries.length === 0) {
    renderPlain(graph, options.base);
    return;
  }
  renderEntries(graph, entries, options);
};

export default render;
