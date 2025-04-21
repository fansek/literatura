import * as path from 'node:path';
import { sort } from 'd3-array';
import { toMarkdown } from 'mdast-util-to-markdown';
import { u } from 'unist-builder';
import componentize from '../../componentize.js';
import { findHighestNonTrivialDescendant } from '../../dir.js';

/**
 * @typedef {import('../../dir.js').Dir} Dir
 * @typedef {Dir['dependencies']} Dependencies
 */

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
   * @param {{tail: string; head: string}} edge
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
                sort(deps, ([other]) => other).map(([other, graph]) => {
                  const edges = [...graph].flatMap(([tail, headSet]) =>
                    [...headSet].map((head) => ({ tail, head })),
                  );

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
 * @param {Dir} dir
 * @param {string} rootPath
 * @returns {import('mdast').RootContent[]}
 */
const dirToMdast = (dir, rootPath) => {
  const nonTrivial = findHighestNonTrivialDescendant(dir);
  // do not print anything for leaf nodes (modules, files)
  // or trivial nodes (with single descendant only)
  if (nonTrivial == null) {
    return [];
  }

  const { dependencies, fullName, subnodes } = nonTrivial;

  const cs = sortComponents(componentize(nonTrivial));

  const dirChildren = cs
    .flat()
    .flat()
    .flatMap((name) =>
      dirToMdast(/** @type {Dir} */ (subnodes.get(name)), rootPath),
    );

  const dirHeading = u('heading', { depth: /** @type {1} */ (1) }, [
    link(path.relative(rootPath, fullName) || '.'),
  ]);
  const dirContent = csToMdast(cs, dependencies, nonTrivial.fullName, rootPath);
  return [...dirChildren, dirHeading, ...dirContent];
};

/**
 * @param {Dir} rootNode
 * @param {string} workingDir
 */
const render = (rootNode, workingDir) => {
  const nonTrivialRootNode = findHighestNonTrivialDescendant(rootNode);
  if (nonTrivialRootNode === undefined) {
    return '';
  }
  const resultMdast = u('root', dirToMdast(nonTrivialRootNode, workingDir));
  return toMarkdown(resultMdast);
};

export default render;
