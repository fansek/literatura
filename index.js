const graphlib = require('@dagrejs/graphlib');
const fs = require('fs');
const path = require('path');

const { log } = console;

/**
 * @typedef {{ v: string }} Node
 * @typedef {{ v: string; w: string }} Edge
 * @typedef {{
 *    nodes: Node[];
 *    edges: Edge[];
 * }} Graph
 */

/** @type {(rawEdge: unknown) => Edge} */
const formEdge = (rawEdge) => {
  if (
    rawEdge == null
    || typeof rawEdge !== 'object'
    || !('v' in rawEdge)
    || !('w' in rawEdge)
  ) {
    throw new Error('Unknown type of provided edge.');
  }
  const { v, w } = rawEdge;
  return { v: String(v), w: String(w) };
};

/** @type {(rawEdges: unknown) => Edge[]} */
const formEdges = (rawEdges) => {
  if (rawEdges == null) {
    return [];
  }
  if (!Array.isArray(rawEdges)) {
    throw new Error('Unknown type of provided edges.');
  }
  return rawEdges.map(formEdge);
};

/** @type {(rawEdges: unknown) => Graph} */
const formGraph = (rawEdges) => {
  const edges = formEdges(rawEdges);
  const nodes = [...new Set(edges.flatMap(({ v, w }) => [v, w]))]
    .map((v) => ({ v }));
  return { nodes, edges };
};

/**
 * @typedef {{
 *    subnodes: Map<string, DirNode>;
 *    dependencies: Map<string, Set<string>>;
 * }} DirNode
 */

/** @type {() => DirNode} */
const newDirNode = () => ({
  subnodes: new Map(),
  dependencies: new Map(),
});

/** @type {(graph: Graph, sep?: '\\' | '/') => DirNode} */
const formDirNode = (graphObj, pathSeparator = path.sep) => {
  const { nodes, edges } = graphObj;
  const dirNode = newDirNode();
  nodes.forEach(({ v }) => {
    let current = dirNode;
    v
      .split(pathSeparator)
      .forEach((name) => {
        const { subnodes } = current;
        if (subnodes.has(name)) {
          current = subnodes.get(name);
        } else {
          const next = newDirNode();
          subnodes.set(name, next);
          current = next;
        }
      });
  });
  edges.forEach((edge) => {
    let current = dirNode;
    const v = edge.v.split(pathSeparator);
    const w = edge.w.split(pathSeparator);
    v.some((name, index) => {
      const equal = name === w[index];
      if (equal) {
        current = current.subnodes.get(name);
      } else {
        const { dependencies } = current;
        if (dependencies.has(name)) {
          dependencies.get(name).add(w[index]);
        } else {
          dependencies.set(name, new Set([w[index]]));
        }
      }
      return !equal;
    });
  });
  return dirNode;
};

const maskSymbols = {
  0b1111: '╶',
  0b1011: '┌',
  0b0111: '└',
  0b0011: '├',
  0b1110: '┏',
  0b1010: '┏',
  0b0110: '┢',
  0b0010: '┢',
  0b1101: '┗',
  0b1001: '┡',
  0b0101: '┗',
  0b0001: '┡',
  0b1100: '┣',
  0b1000: '┣',
  0b0100: '┣',
  0b0000: '┣',
};

const maskContinuationSymbols = {
  0b11: ' ',
  0b10: '┃',
  0b01: '│',
  0b00: '┃',
};

/** @type {(dirNode: DirNode, prefix?: string) => string} */
const printDirNode = (dirNode, prefix = '') => {
  const { subnodes, dependencies } = dirNode;
  const graph = graphlib.json.read({
    nodes: [...subnodes.keys()].map((v) => ({ v })),
    edges: [...dependencies]
      .flatMap(([v, ws]) => [...ws].map((w) => ({ v, w }))),
  });
  const components = graphlib.alg
    .components(graph)
    .map((component) => graph.filterNodes(component.includes.bind(component)));
  const sccsByComponent = components.map(graphlib.alg.tarjan);
  sccsByComponent.forEach((sccs) => {
    sccs.forEach((scc) => scc.sort());
  });
  sccsByComponent.sort();
  const result = sccsByComponent
    .flatMap((sccs) => sccs
      .flatMap((scc, sccIndex) => {
        const sccIndexMask = (
          0b1000 * Number(sccIndex === 0)
          + 0b0100 * Number(sccIndex === sccs.length - 1)
        );
        return scc
          .map((node, nodeIndex) => {
            const nodeIndexMask = (
              0b0010 * Number(nodeIndex === 0)
              + 0b0001 * Number(nodeIndex === scc.length - 1)
            );
            const mask = sccIndexMask + nodeIndexMask;
            const sign = maskSymbols[mask] ?? mask;
            const continuationMask = (
              // eslint-disable-next-line no-bitwise
              Number((sccIndexMask & 0b0100) === 0b0100) * 0b10
              // eslint-disable-next-line no-bitwise
              + Number((nodeIndexMask & 0b01) === 0b01) * 0b01
            );
            const continuationSign = maskContinuationSymbols[
              continuationMask
            ] ?? continuationMask;
            const subnode = subnodes.get(node);
            const subnodeStr = subnode == null || subnode.subnodes.size === 0
              ? ''
              : `\n${
                printDirNode(subnode, `${prefix}${continuationSign}   `)
              }`;
            return `${prefix}${sign} ${node}${subnodeStr}`;
          });
      }))
    .join('\n');
  return result;
};

const main = () => {
  const jsonString = fs.readFileSync(0).toString();
  const graph = formGraph(JSON.parse(jsonString));
  const dirNode = formDirNode(graph);
  const dirNodeStr = printDirNode(dirNode);
  log(dirNodeStr);
};

main();
