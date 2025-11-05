import path from 'node:path';
import { InternMap, rollup, sort } from 'd3-array';
import { componentizeModuleGraph } from './componentize.js';
import sprintf from './format.js';

export const DEFAULT_NODE_FORMAT = '%src%t%ci';
export const DEFAULT_EDGE_FORMAT = '%src%t%dst%t%weight';

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
 * @param {string} src an edge source
 * @param {string} dst an edge destination
 */
const findLowestCommonAncestor = (src, dst) => {
  const srcArr = src.split(path.sep);
  const dstArr = dst.split(path.sep);
  const i = srcArr.findIndex((value, index) => value !== dstArr[index]);
  return (i === -1 ? srcArr : srcArr.slice(0, i)).join(path.sep) || path.sep;
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
 * @param {unknown[]} arr
 * @param {number} index
 * @returns
 */
const formatIndex = (arr, index) => (arr.length === 1 ? '-' : index);

/**
 * @param {Map<string, Map<string, number>>} graph
 * @param {string} [format]
 */
const renderNodes = (graph, format = DEFAULT_NODE_FORMAT) => {
  const components = componentizeModuleGraph(graph, (m) => m.keys());
  components.forEach((c, ci) => {
    c.forEach((scc, scci) => {
      scc.forEach((src, ni) =>
        process.stdout.write(
          sprintf(format, {
            src,
            ci: `${formatIndex(components, ci)}:${formatIndex(c, scci)}:${formatIndex(scc, ni)}`,
          }) + '\n',
        ),
      );
    });
  });
};

/**
 * @param {Map<string, Map<string, number>>} graph
 * @param {string} [format]
 */
const renderEdges = (graph, format = DEFAULT_EDGE_FORMAT) => {
  sort([...graph], ([src]) => src).forEach(([src, dsts]) =>
    sort(dsts, ([dst]) => dst).forEach(([dst, weight]) => {
      return process.stdout.write(sprintf(format, { src, dst, weight }) + '\n');
    }),
  );
};

/**
 * @param {Map<string, Set<string>>} graph
 * @param {string} baseDir
 * @param {string[]} entries
 * @param {{ nodeFormat?: string; edgeFormat?: string }} options
 */
const renderEntries = (graph, baseDir, entries, options) => {
  const resolvedEntries = entries.map((entry) => path.resolve(baseDir, entry));
  const entrySet = new Set(resolvedEntries);
  const edges = [...graph].flatMap(([src, dsts]) =>
    [...dsts].flatMap((dst) => {
      const lca = findLowestCommonAncestor(src, dst);
      return entrySet.has(lca) ? [{ src, dst, lca }] : [];
    }),
  );
  const dirs = rollup(
    edges,
    (edgesByLCA) =>
      rollup(
        edgesByLCA,
        (edgesBySrc) =>
          rollup(
            edgesBySrc,
            (edgesByDst) => edgesByDst.length,
            ({ dst, lca }) => getHighestComponent(lca, dst),
          ),
        ({ src, lca }) => getHighestComponent(lca, src),
      ),
    ({ lca }) => lca,
  );

  resolvedEntries.forEach((entry) => {
    process.stdout.write(`${entry}\n`);
    const entryGraph = dirs.get(entry) ?? new InternMap();
    renderNodes(entryGraph, options.nodeFormat);
    renderEdges(entryGraph, options.edgeFormat);
  });
};

/**
 * @param {Map<string, Set<string>>} graph
 * @param {string} baseDir
 * @param {string[]} entries
 * @param {{ nodeFormat?: string; edgeFormat?: string }} options
 */
const renderGraph = (graph, baseDir, entries, options) => {
  if (entries.length === 0) {
    renderPlain(graph, baseDir);
    return;
  }
  renderEntries(graph, baseDir, entries, options);
};

export default renderGraph;
