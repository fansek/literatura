import path from 'node:path';
import { InternMap, rollup, sort, sum } from 'd3-array';
import { componentize } from './componentize.js';
import sprintf from './format.js';
import drawDiagram from './draw-diagram.js';

export const DEFAULT_NODE_FORMAT = '%diag%t%-3deg%t%src';
export const DEFAULT_EDGE_FORMAT = '%-3weight%t%src%t%ref';

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
 * @param {string} src a source
 * @param {string} ref a node references by the source
 */
const findLowestCommonAncestor = (src, ref) => {
  const srcArr = src.split(path.sep);
  const refArr = ref.split(path.sep);
  const i = srcArr.findIndex((value, index) => value !== refArr[index]);
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
 * @param {Map<string, Map<string, number>>} graph
 * @param {string} [format]
 */
const renderNodes = (graph, format = DEFAULT_NODE_FORMAT) => {
  const components = componentize(
    [...graph.keys()],
    (src) => graph.get(src)?.keys() ?? [],
  );
  const diagram = drawDiagram(
    components.map(({ src }) => src),
    (src) => graph.get(src)?.keys() ?? [],
  );
  components.forEach(({ src, cni }, index) => {
    process.stdout.write(
      sprintf(format, {
        src,
        cni,
        diag: diagram[index],
        deg: sum([...(graph.get(src)?.values() ?? [])]),
      }) + '\n',
    );
  });
};

/**
 * @param {Map<string, Map<string, number>>} graph
 * @param {string} [format]
 */
const renderEdges = (graph, format = DEFAULT_EDGE_FORMAT) => {
  sort([...graph], ([src]) => src).forEach(([src, refs]) =>
    sort(refs, ([ref]) => ref).forEach(([ref, weight]) => {
      return process.stdout.write(sprintf(format, { src, ref, weight }) + '\n');
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
  const edges = [...graph].flatMap(([src, refs]) =>
    [...refs].flatMap((ref) => {
      const lca = findLowestCommonAncestor(src, ref);
      return entrySet.has(lca) ? [{ src, ref, lca }] : [];
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
            (edgesByRef) => edgesByRef.length,
            ({ ref, lca }) => getHighestComponent(lca, ref),
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
const render = (graph, baseDir, entries, options) => {
  if (entries.length === 0) {
    renderPlain(graph, baseDir);
    return;
  }
  renderEntries(graph, baseDir, entries, options);
};

export default render;
