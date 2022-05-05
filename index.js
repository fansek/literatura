const graphlib = require('graphlib');

function pathTopoSort(graphObj) {
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
}

function newTree() {
  return {
    subtrees: new Map(),
    edges: []
  };
}

function printTree(tree, indent = 0) {
  const { subtrees, edges } = tree;
  const graph = graphlib.json.read({
    nodes: [...subtrees.keys()].map((node) => ({ v: node })),
    edges
  });
  const components = graphlib.alg
    .components(graph)
    .map((component) => graph.filterNodes(component.includes.bind(component)));
  const sccsComponents = components.map(graphlib.alg.tarjan);
  sccsComponents.forEach((sccs) => {
    sccs.forEach((scc) => scc.sort());
  })
  sccsComponents.sort();
  const result = sccsComponents
    .flatMap((sccs) => sccs
      .flatMap((scc, sccIndex) => scc
        .map((node, nodeIndex) => (
          ' '.repeat(indent)
          + (sccIndex === 0 ? '*' : nodeIndex === 0 ? '-' : '!')
          + ' ' + node
          + (
            subtrees.get(node).subtrees.size > 0
              ? '\n' + printTree(subtrees.get(node), indent + 4)
              : ''
          )
        ))))
    .join('\n');
  return result;
}

module.exports = pathTopoSort;
