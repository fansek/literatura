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
 * @param {string} baseDir a base dir path
 * @returns {import('mdast').List}
 */
const sccsToMdast = (sccs, dependencies, contextPath, baseDir) => {
  /**
   * @param {{tail: string; head: string}} edge
   * @returns {import('mdast').ListItem}
   */
  const edgeToMdast = ({ tail, head }) =>
    u('listItem', [
      u('paragraph', [
        link(path.relative(baseDir, tail), path.relative(contextPath, tail)),
        u('text', ' → '),
        link(path.relative(baseDir, head), path.relative(contextPath, head)),
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
      path.relative(baseDir, path.join(contextPath, nodeName)),
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
 * @param {string} baseDir a base dir path
 * @returns {import('mdast').RootContent[]}
 */
const csToMdast = (cs, dependencies, contextPath, baseDir) =>
  cs
    .flatMap((sccs) => [
      sccsToMdast(sccs, dependencies, contextPath, baseDir),
      u('thematicBreak'),
    ])
    .slice(0, -1);

/**
 * @param {Dir} dir
 * @param {string} baseDir a base dir path
 * @returns {import('mdast').RootContent[]}
 */
const dirToMdast = (dir, baseDir) => {
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
      dirToMdast(/** @type {Dir} */ (subnodes.get(name)), baseDir),
    );

  const dirHeading = u('heading', { depth: /** @type {1} */ (1) }, [
    link(path.relative(baseDir, fullName) || '.'),
  ]);
  const dirContent = csToMdast(cs, dependencies, nonTrivial.fullName, baseDir);
  return [...dirChildren, dirHeading, ...dirContent];
};

/**
 * @param {Dir} rootNode
 * @param {string} baseDir a base dir path
 */
const render = (rootNode, baseDir) => {
  const nonTrivialRootNode = findHighestNonTrivialDescendant(rootNode);
  if (nonTrivialRootNode === undefined) {
    return;
  }
  const resultMdast = u('root', dirToMdast(nonTrivialRootNode, baseDir));
  process.stdout.write(toMarkdown(resultMdast) + '\n');
};

export default render;
