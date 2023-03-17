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

/** @type {(dirNode: DirNode) => graphlib.Graph} */
const graphDependencies = (dirNode) => {
  const { subnodes, dependencies } = dirNode;
  return graphlib.json.read({
    nodes: [...subnodes.keys()].map((v) => ({ v })),
    edges: [...dependencies]
      .flatMap(([v, ws]) => [...ws].map((w) => ({ v, w }))),
  });
};

/** @type {(graph: graphlib.Graph) => string[][][]} */
const getSortedSccsByComponent = (graph) => {
  const components = graphlib.alg
    .components(graph)
    .map((component) => graph.filterNodes(component.includes.bind(component)));
  const sccsByComponent = components.map(graphlib.alg.tarjan);
  sccsByComponent.forEach((sccs) => {
    sccs.forEach((scc) => scc.sort());
  });
  sccsByComponent.sort();
  return sccsByComponent;
};

const sccsStart = 0b1000;
const sccsEnd = 0b0100;
const sccStart = 0b0010;
const sccEnd = 0b0001;

const maskSymbols = {
  0b1111: '╶─',
  0b1011: '┌─',
  0b0111: '└─',
  0b0011: '├─',
  0b1110: '┏━',
  0b1010: '┏━',
  0b0110: '┢━',
  0b0010: '┢━',
  0b1101: '┗━',
  0b1001: '┡━',
  0b0101: '┗━',
  0b0001: '┡━',
  0b1100: '┣━',
  0b1000: '┣━',
  0b0100: '┣━',
  0b0000: '┣━',
};

const maskContinuationSymbols = {
  0b11: '  ',
  0b10: '┃ ',
  0b01: '│ ',
  0b00: '┃ ',
};

/**
@type {
  (sccIndex: number, lastSccIndex: number) =>
  (nodeIndex: number, lastNodeIndex: number) =>
  { symbol: string; continuationSymbol: string }
}
*/
const symbolsBySccIndex = (sccIndex, lastSccIndex) => {
  const sccIndexContinuationMask = (
    sccsEnd * Number(sccIndex === lastSccIndex)
  );
  const sccIndexMask = (
    sccsStart * Number(sccIndex === 0) + sccIndexContinuationMask
  );
  /**
  @type {
    (nodeIndex: number, lastNodeIndex: number) =>
    { symbol: string; continuationSymbol: string }
  }
  */
  const symbolsByNodeIndex = (nodeIndex, lastNodeIndex) => {
    const nodeIndexContinuationMask = (
      sccEnd * Number(nodeIndex === lastNodeIndex)
    );
    const nodeIndexMask = (
      sccStart * Number(nodeIndex === 0) + nodeIndexContinuationMask
    );
    const mask = sccIndexMask + nodeIndexMask;
    const symbol = maskSymbols[mask];
    const continuationMask = (
      Number(sccIndexContinuationMask === sccsEnd) * 0b10
      + Number(nodeIndexContinuationMask === sccEnd) * 0b1
    );
    const continuationSymbol = maskContinuationSymbols[continuationMask];
    return { symbol, continuationSymbol };
  };
  return symbolsByNodeIndex;
};

/** @type {(dirNode: DirNode, prefix?: string) => string} */
const printDirNode = (dirNode, prefix = '') => {
  const { subnodes } = dirNode;
  const graph = graphDependencies(dirNode);
  const sccsByComponent = getSortedSccsByComponent(graph);
  const result = sccsByComponent
    .flatMap((sccs) => sccs
      .flatMap((scc, sccIndex) => {
        const symbolsByNodeIndex = symbolsBySccIndex(sccIndex, sccs.length - 1);
        return scc
          .map((node, nodeIndex) => {
            const { symbol, continuationSymbol } = (
              symbolsByNodeIndex(nodeIndex, scc.length - 1)
            );
            const subnode = subnodes.get(node);
            const subnodeStr = subnode == null || subnode.subnodes.size === 0
              ? ''
              : `\n${
                printDirNode(subnode, `${prefix}${continuationSymbol} `)
              }`;
            return `${prefix}${symbol} ${node}${subnodeStr}`;
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
