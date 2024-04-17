import * as path from 'node:path';
import graphlib from '@dagrejs/graphlib';
import * as d3 from 'd3-array';

/**
 * @typedef {{ v: string }} Node
 * @typedef {{ v: string; w: string }} Edge
 * @typedef {{
 *    nodes: Node[];
 *    edges: Edge[];
 * }} Graph
 * @typedef {{
 *    name: string;
 *    fullName: string;
 *    subnodes: Map<string, DirNode>;
 *    dependencies: Map<string, Map<string, [string, string][]>>;
 * }} DirNode
 */

/** @type {(name: string, fullName: string) => DirNode} */
const newDirNode = (name, fullName) => ({
  name,
  fullName,
  subnodes: new Map(),
  dependencies: new Map(),
});

/** @type {<K, V>(map: Map<K, V & {}>, key: K, defaultsTo: V & {}) => V & {}} */
const setDefault = (map, key, defaultsTo) => {
  const value = map.get(key);
  if (value != null) {
    return value;
  }
  map.set(key, defaultsTo);
  return defaultsTo;
};

/** @type {(edges: [string, string][]) => string[]} */
const findNodes = (edges) => [...new Set(edges.flat())];

/** @type {(edges: [string, string][], sep?: '\\' | '/') => DirNode} */
export const formDirNode = (edges, pathSeparator = path.sep) => {
  const sortedEdges = d3.sort(edges, (edge) => edge[0], (edge) => edge[1]);
  const nodes = findNodes(sortedEdges);
  const dirNode = newDirNode('/', '/');
  nodes.forEach((node) => {
    let current = dirNode;
    node
      .split(pathSeparator)
      .forEach((name, index, vArray) => {
        const { subnodes } = current;
        let next = subnodes.get(name);
        if (next != null) {
          current = next;
        } else {
          next = newDirNode(
            name,
            vArray.slice(0, index + 1).join(pathSeparator),
          );
          subnodes.set(name, next);
          current = next;
        }
      });
  });
  /** @type {Map<string, Set<string>>} */
  const edgeSet = new Map();

  sortedEdges.forEach(([tailStr, headStr]) => {
    let current = dirNode;
    const tail = tailStr.split(pathSeparator);
    const head = headStr.split(pathSeparator);
    tail.some((name, index) => {
      const equal = name === head[index];
      if (equal) {
        current = /** @type {DirNode} */ (current.subnodes.get(name));
      } else {
        const { dependencies } = current;
        let heads = edgeSet.get(tailStr);
        if (heads == null || !heads.has(headStr)) {
          if (heads == null) {
            heads = new Set();
            edgeSet.set(tailStr, heads);
          }
          heads.add(headStr);
          setDefault(setDefault(dependencies, name, new Map()), head[index], [])
            .push([tailStr, headStr]);
        }
      }
      return !equal;
    });
  });
  return dirNode;
};

/** @type {(dirNode: DirNode) => graphlib.Graph} */
const dirNodeToGraph = (dirNode) => {
  const { subnodes, dependencies } = dirNode;
  return graphlib.json.read({
    nodes: Array.from(subnodes.keys(), (v) => ({ v })),
    edges: [...dependencies]
      .flatMap(([v, ws]) => Array.from(ws.keys(), (w) => ({ v, w }))),
  });
};

/** @type {(dirNode: DirNode) => string[][][]} */
export const getSortedSccsByComponent = (dirNode) => {
  const graph = dirNodeToGraph(dirNode);
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
