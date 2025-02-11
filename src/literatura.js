import { createRequire } from 'node:module';
import * as path from 'node:path';
import { sort } from 'd3-array';
import { parseDependencyTree } from 'dpdm';
import { toMarkdown } from 'mdast-util-to-markdown';
import { u } from 'unist-builder';
import formDirNode from './dir-node.js';
import componentize from './componentize.js';

const require = createRequire(import.meta.url);

/**
 * @typedef {import('./dir-node.js').DirNode} DirNode
 * @typedef {DirNode['dependencies']} Dependencies
 * @typedef {import('./dir-node.js').Edge} Edge
 */

/**
 * @param {DirNode} dirNode
 * @returns {DirNode | undefined}
 */
const findHighestNonTrivialDescendant = (dirNode) => {
  if (dirNode.subnodes.size > 1) {
    return dirNode;
  }
  if (dirNode.subnodes.size === 1) {
    return findHighestNonTrivialDescendant([...dirNode.subnodes.values()][0]);
  }
  return undefined;
};

/**
 * @param {string[][][]} cs
 * @returns {string[][][]}
 */
const sortComponents = (cs) =>
  sort(
    cs.map(
      // sccs are ordered topologically
      (sccs) => sccs.map((scc) => sort(scc)),
    ),
  );

/**
 * @param {string} url
 * @param {string} [title]
 * @returns {import('mdast').Link}
 */
const link = (url, title = url) => u('link', { url }, [u('text', title)]);

/**
 * @param {string[][]} sccs
 * @param {Dependencies} dependencies
 * @param {string} contextPath
 * @param {string} rootPath
 * @returns {import('mdast').List}
 */
const sccsToMdast = (sccs, dependencies, contextPath, rootPath) => {
  /**
   * @param {Edge} edge
   * @returns {import('mdast').ListItem}
   */
  const edgeToMdast = ({ tail, head }) =>
    u('listItem', [
      u('paragraph', [
        link(path.relative(rootPath, tail), path.relative(contextPath, tail)),
        u('text', ' → '),
        link(path.relative(rootPath, head), path.relative(contextPath, head)),
      ]),
    ]);
  const cyclicDeps = new Set(
    sccs.flatMap((scc) => (scc.length > 1 ? scc : [])),
  );

  /**
   * @param {string} nodeName
   * @param {boolean} [arrow]
   * @returns {import('mdast').Paragraph}
   */
  const decoratedLink = (nodeName, arrow) => {
    const prefix = arrow ? [u('text', '↘ ')] : [];
    const l = link(
      path.relative(rootPath, path.join(contextPath, nodeName)),
      nodeName,
    );
    const maybeEmphasised = cyclicDeps.has(nodeName)
      ? [u('emphasis', [l]), u('text', ' (!)')]
      : [l];
    return u('paragraph', [...prefix, ...maybeEmphasised]);
  };

  const tailListItems = sccs.flatMap((scc) =>
    scc.map((nodeName) => {
      const deps = dependencies.get(nodeName);
      const maybeHeadList =
        deps == null || deps.size === 0
          ? []
          : [
              u(
                'list',
                { spread: false },
                sort(deps, ([other]) => other).map(([other, edges]) => {
                  const maybeEdgeList =
                    edges.length === 1 &&
                    nodeName === path.relative(contextPath, edges[0].tail) &&
                    other === path.relative(contextPath, edges[0].head)
                      ? []
                      : [
                          u(
                            'list',
                            { spread: false },
                            sort(
                              edges,
                              ({ tail }) => tail,
                              ({ head }) => head,
                            ).map(edgeToMdast),
                          ),
                        ];
                  return u('listItem', { spread: false }, [
                    decoratedLink(other, true),
                    ...maybeEdgeList,
                  ]);
                }),
              ),
            ];
      return u('listItem', { spread: false }, [
        decoratedLink(nodeName),
        ...maybeHeadList,
      ]);
    }),
  );
  return u('list', { spread: false }, tailListItems);
};

/**
 * @param {string[][][]} cs
 * @param {Dependencies} dependencies
 * @param {string} contextPath
 * @param {string} rootPath
 * @returns {import('mdast').RootContent[]}
 */
const csToMdast = (cs, dependencies, contextPath, rootPath) =>
  cs
    .flatMap((sccs) => [
      sccsToMdast(sccs, dependencies, contextPath, rootPath),
      u('thematicBreak'),
    ])
    .slice(0, -1);

/**
 * @param {DirNode} dirNode
 * @param {string} rootPath
 * @returns {import('mdast').RootContent[]}
 */
const dirNodeToMdast = (dirNode, rootPath) => {
  const nonTrivial = findHighestNonTrivialDescendant(dirNode);
  // do not print anything for leaf nodes (modules, files)
  // or trivial nodes (with single descendant only)
  if (nonTrivial == null) {
    return [];
  }

  const { dependencies, fullName, subnodes } = nonTrivial;

  const cs = sortComponents(componentize(nonTrivial));

  const dirNodeChildren = cs
    .flat()
    .flat()
    .flatMap((name) =>
      dirNodeToMdast(/** @type {DirNode} */ (subnodes.get(name)), rootPath),
    );

  const dirNodeHeading = u('heading', { depth: /** @type {1} */ (1) }, [
    link(path.relative(rootPath, fullName) || '.'),
  ]);
  const dirNodeContent = csToMdast(
    cs,
    dependencies,
    nonTrivial.fullName,
    rootPath,
  );
  return [...dirNodeChildren, dirNodeHeading, ...dirNodeContent];
};

/**
 * @param {string[]} entries
 * @param {string} workingDir
 * @param {boolean} transform
 * @returns {Promise<void>}
 */
const printDeps = async (entries, workingDir, transform) => {
  const depTree = await parseDependencyTree(entries, { transform });
  const edges = Object.entries(depTree).flatMap(([from, to]) =>
    (to ?? [])
      // ignore core modules
      .filter(({ request }) => require.resolve.paths(request) != null)
      .map(({ id }) => id)
      .filter((value) => value != null)
      .map((id) => ({ tail: path.resolve(from), head: path.resolve(id) })),
  );
  const dirNode = formDirNode(edges);
  const rootNode = findHighestNonTrivialDescendant(dirNode);
  if (rootNode === undefined) {
    throw new Error(`No deps root was found: ${dirNode}`);
  }

  const resultMdast = u('root', dirNodeToMdast(rootNode, workingDir));
  // console.log(JSON.stringify(resultMdast, undefined, 2));
  console.log(toMarkdown(resultMdast));
};

export default printDeps;
