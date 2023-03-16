const graphlib = require('@dagrejs/graphlib');
const fs = require('fs');

const { log } = console;

/**
 * @typedef {{ v: string }} Node
 * @typedef {{ v: string; w: string }} Edge
 * @typedef {{
 *    nodes: Node[];
 *    edges: Edge[];
 * }} Graph
 */

/** @type {(edge: unknown) => Edge} */
const formEdge = (edge) => {
  if (
    edge == null || typeof edge !== 'object' || !('v' in edge) || !('w' in edge)
  ) {
    throw new Error('Unknown type of provided edge.');
  }
  const { v, w } = edge;
  return { v: String(v), w: String(w) };
};

/** @type {(edges: unknown) => Edge[]} */
const formEdges = (edges) => {
  if (edges == null) {
    return [];
  }
  if (!Array.isArray(edges)) {
    throw new Error('Unknown type of provided edges.');
  }
  return edges.map(formEdge);
};

/** @type {(edges: unknown) => Graph} */
const formGraph = (rawEdges) => {
  const edges = formEdges(rawEdges);
  const nodes = [...new Set(edges.flatMap(({ v, w }) => [v, w]))]
    .map((v) => ({ v }));
  return { nodes, edges };
};

/**
 * @typedef {{
 *    subtrees: Map<string, Tree>;
 *    edges: Map<string, Set<string>>;
 * }} Tree
 */

/** @type {() => Tree} */
const newTree = () => ({
  subtrees: new Map(),
  edges: new Map(),
});

/** @type {(graph: Graph) => Tree} */
const formTree = (graphObj) => {
  const importedGraph = graphlib.json.read(graphObj);
  const tree = newTree();
  importedGraph
    .nodes()
    .forEach((node) => {
      let current = tree;
      node
        .split('/')
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
  importedGraph
    .edges()
    .forEach((edge) => {
      let current = tree;
      const v = edge.v.split('/');
      const w = edge.w.split('/');
      v.some((name, index) => {
        const equal = name === w[index];
        if (equal) {
          current = current.subtrees.get(name);
        } else {
          const { edges } = current;
          if (edges.has(name)) {
            edges.get(name).add(w[index]);
          } else {
            edges.set(name, new Set([w[index]]));
          }
        }
        return !equal;
      });
    });
  return tree;
};

/** @type {(tree: Tree, ident: number) => string} */
const printTree = (tree, indent = 0) => {
  const { subtrees, edges } = tree;
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
              : `\n${printTree(subtree, indent + 4)}`;
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
  const tree = formTree(graph);
  const treeStr = printTree(tree, 0);
  log(treeStr);
};

main();
