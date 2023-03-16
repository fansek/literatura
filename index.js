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
 *    subtrees: Map<string, DirTree>;
 *    dependencies: Map<string, Set<string>>;
 * }} DirTree
 */

/** @type {() => DirTree} */
const newTree = () => ({
  subtrees: new Map(),
  dependencies: new Map(),
});

/** @type {(graph: Graph, sep?: '\\' | '/') => DirTree} */
const formDirTree = (graphObj, pathSeparator = path.sep) => {
  const { nodes, edges } = graphObj;
  const tree = newTree();
  nodes.forEach(({ v }) => {
    let current = tree;
    v
      .split(pathSeparator)
      .forEach((name) => {
        const { subtrees } = current;
        if (subtrees.has(name)) {
          current = subtrees.get(name);
        } else {
          const next = newTree();
          subtrees.set(name, next);
          current = next;
        }
      });
  });
  edges.forEach((edge) => {
    let current = tree;
    const v = edge.v.split(pathSeparator);
    const w = edge.w.split(pathSeparator);
    v.some((name, index) => {
      const equal = name === w[index];
      if (equal) {
        current = current.subtrees.get(name);
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
  return tree;
};

/** @type {(tree: DirTree, ident: number) => string} */
const printDirTree = (tree, indent = 0) => {
  const { subtrees, dependencies: edges } = tree;
  const graph = graphlib.json.read({
    nodes: [...subtrees.keys()].map((v) => ({ v })),
    edges: [...edges].flatMap(([v, ws]) => [...ws].map((w) => ({ v, w }))),
  });
  const components = graphlib.alg
    .components(graph)
    .map((component) => graph.filterNodes(component.includes.bind(component)));
  const sccsOfComponents = components.map(graphlib.alg.tarjan);
  sccsOfComponents.forEach((sccs) => {
    sccs.forEach((scc) => scc.sort());
  });
  sccsOfComponents.sort();
  const indentation = ' '.repeat(indent);
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
            const subtree = subtrees.get(node);
            const subtreeStr = subtree == null || subtree.subtrees.size === 0
              ? ''
              : `\n${printDirTree(subtree, indent + 4)}`;
            return (
              `${indentation + sign} ${node}${subtreeStr}`
            );
          });
      }))
    .join('\n');
  return result;
};

const main = () => {
  const jsonString = fs.readFileSync(0).toString();
  const graph = formGraph(JSON.parse(jsonString));
  const tree = formDirTree(graph);
  const treeStr = printDirTree(tree, 0);
  log(treeStr);
};

main();
