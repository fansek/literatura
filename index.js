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

/** @type {(dirNode: DirNode, indentStep?: number, ident?: number) => string} */
const printDirNode = (dirNode, indentStep = 4, currentIndent = 0) => {
  const { subnodes, dependencies } = dirNode;
  const graph = graphlib.json.read({
    nodes: [...subnodes.keys()].map((v) => ({ v })),
    edges: [...dependencies]
      .flatMap(([v, ws]) => [...ws].map((w) => ({ v, w }))),
  });
  const components = graphlib.alg
    .components(graph)
    .map((component) => graph.filterNodes(component.includes.bind(component)));
  const sccsOfComponents = components.map(graphlib.alg.tarjan);
  sccsOfComponents.forEach((sccs) => {
    sccs.forEach((scc) => scc.sort());
  });
  sccsOfComponents.sort();
  const indentSpaces = ' '.repeat(currentIndent);
  const result = sccsOfComponents
    .flatMap((sccs) => sccs
      .flatMap((scc, sccIndex) => {
        const sccContainsCycle = scc.length > 1;
        return scc
          .map((node) => {
            let sign;
            if (sccContainsCycle) {
              sign = '!';
            } else if (sccIndex === 0) {
              sign = '*';
            } else {
              sign = '^';
            }
            const subnode = subnodes.get(node);
            const subnodeStr = subnode == null || subnode.subnodes.size === 0
              ? ''
              : `\n${
                printDirNode(subnode, indentStep, currentIndent + indentStep)
              }`;
            return `${indentSpaces}${sign} ${node}${subnodeStr}`;
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
