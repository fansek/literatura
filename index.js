const graphlib = require('@dagrejs/graphlib');
const process = require('process');
const fs = require('fs');

const { log } = console;

/**
 * @typedef {{
 *    subtrees: Map<string, Tree>;
 *    edges: { v: string; w: string }[];
 * }} Tree
 */

/** @type {() => Tree} */
const newTree = () => ({
  subtrees: new Map(),
  edges: [],
});

/** @type {(tree: Tree, ident: number) => string} */
const printTree = (tree, indent = 0) => {
  const { subtrees, edges } = tree;
  const graph = graphlib.json.read({
    nodes: [...subtrees.keys()].map((node) => ({ v: node })),
    edges,
  });
  const components = graphlib.alg
    .components(graph)
    .map((component) => graph.filterNodes(component.includes.bind(component)));
  const sccsComponents = components.map(graphlib.alg.tarjan);
  sccsComponents.forEach((sccs) => {
    sccs.forEach((scc) => scc.sort());
  });
  sccsComponents.sort();
  const indentation = ' '.repeat(indent);
  const result = sccsComponents
    .flatMap((sccs) => sccs
      .flatMap((scc, sccIndex) => scc
        .map((node, nodeIndex) => {
          let sign;
          if (sccIndex === 0) {
            sign = '*';
          } else if (nodeIndex === 0) {
            sign = '-';
          } else {
            sign = '!';
          }
          const subtree = subtrees.get(node);
          const subtreeStr = subtree == null || subtree.subtrees.size === 0
            ? ''
            : `\n${printTree(subtree, indent + 4)}`;
          return (
            `${indentation + sign} ${node}${subtreeStr}`
          );
        })))
    .join('\n');
  return result;
};

const pathTopoSort = (graphObj) => {
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
          current.edges.push({ v: name, w: w[index] });
        }
        return !equal;
      });
    });
  return printTree(tree, 0);
};

const main = () => {
  // log(`root dir: ${process.argv[2] ?? '.'}`);

  const jsonString = fs.readFileSync(process.stdin.fd, 'utf-8');
  const parsedEdges = JSON.parse(jsonString);
  const result = pathTopoSort(
    // [
    //   ['b', 'd'], ['b', 'd'], ['b', 'a'], ['a', 'b'], ['c', 'e']
    //   ['a', 'b'], ['b', 'c'], ['c', 'd']
    // ]
    // {
    //   nodes: [{ v: 'b' }, { v: 'd' }, { v: 'a' }, { v: 'c' }, { v: 'e' }],
    //   edges: [
    //     { v: 'b', w: 'd' },
    //     { v: 'b', w: 'a' },
    //     { v: 'a', w: 'b' },
    //     { v: 'c', w: 'e' }
    //   ]
    // }
    { edges: parsedEdges },
  );
  log(result);
};

main();
