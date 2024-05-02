#!/usr/bin/env node

import { createRequire } from 'node:module';
import * as path from 'node:path';
import * as commander from 'commander';
import { parseDependencyTree } from 'dpdm';
import { toMarkdown } from 'mdast-util-to-markdown';
import { u } from 'unist-builder';
import formDirNode from './dir-node.js';
import isNotNull from './is-not-null.js';
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
  const edgeToMdast = ({ tail, head }) => u('listItem', [
    u('paragraph', [
      link(path.relative(rootPath, tail), path.relative(contextPath, tail)),
      u('text', ' → '),
      link(path.relative(rootPath, head), path.relative(contextPath, head)),
    ]),
  ]);
  const cyclicDeps = new Set(sccs.flatMap(
    (scc) => (scc.length > 1 ? scc : []),
  ));

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

  const tailMdasts = sccs
    .flatMap((scc) => scc
      .map((nodeName) => {
        const deps = dependencies.get(nodeName);
        const maybeTailListMdast = deps == null || deps.size === 0
          ? []
          : [
            u(
              'list',
              { spread: false },
              [...deps]
                .map(
                  ([other, files]) => {
                    const maybeEdgeListMdast = (
                      files.length === 1
                      && nodeName === path.relative(contextPath, files[0].tail)
                      && other === path.relative(contextPath, files[0].head)
                    ) ? []
                      : [u('list', { spread: false }, files.map(edgeToMdast))];
                    return u(
                      'listItem',
                      { spread: false },
                      [decoratedLink(other, true), ...maybeEdgeListMdast],
                    );
                  },
                ),
            ),
          ];
        return u(
          'listItem',
          { spread: false },
          [decoratedLink(nodeName), ...maybeTailListMdast],
        );
      }));
  return u('list', { spread: false }, tailMdasts);
};

/**
 * @param {string[][][]} sccsByComponent
 * @param {Dependencies} dependencies
 * @param {string} contextPath
 * @param {string} rootPath
 * @returns {import('mdast').RootContent[]}
 */
const sccsByComponentToMdast = (
  sccsByComponent,
  dependencies,
  contextPath,
  rootPath,
) => sccsByComponent
  .flatMap(
    (sccs) => [
      sccsToMdast(sccs, dependencies, contextPath, rootPath),
      u('thematicBreak'),
    ],
  )
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

  const cs = componentize(nonTrivial);

  const dirNodeChildren = cs
    .flat()
    .flat()
    .flatMap((name) => dirNodeToMdast(
      /** @type {DirNode} */ (subnodes.get(name)),
      rootPath,
    ));

  const dirNodeHeading = u(
    'heading',
    { depth: /** @type {1} */ (1) },
    [link(path.relative(rootPath, fullName) || '.')],
  );
  const dirNodeContent = sccsByComponentToMdast(
    cs,
    dependencies,
    nonTrivial.fullName,
    rootPath,
  );
  return [
    ...dirNodeChildren,
    dirNodeHeading,
    ...dirNodeContent,
  ];
};

/**
 * @param {string[]} entries
 * @returns {Promise<void>}
 */
const printDeps = async (entries) => {
  const depTree = await parseDependencyTree(entries, {});
  const edges = Object
    .entries(depTree)
    .flatMap(
      ([from, to]) => (to ?? [])
        // ignore core modules
        .filter(({ request }) => require.resolve.paths(request) != null)
        .map(({ id }) => id)
        .filter(isNotNull)
        .map((id) => ({ tail: path.resolve(from), head: path.resolve(id) })),
    );
  const dirNode = formDirNode(edges);
  const rootNode = findHighestNonTrivialDescendant(dirNode);
  if (rootNode === undefined) {
    throw new Error(`No deps root was found: ${dirNode}`);
  }

  const resultMdast = u('root', dirNodeToMdast(rootNode, rootNode.fullName));
  // console.log(JSON.stringify(resultMdast, undefined, 2));
  console.log(toMarkdown(resultMdast));
};

const { program } = commander;
program
  .name('literatura')
  .description(
    'CLI to build topologically ordered literature from code '
    + 'with respect for code directory structure.',
  )
  .argument(
    '<entries...>',
    'entries for dependency tree traversal (see manual for dpdm)',
  );

program.parse();

const entries = program.args;

printDeps(entries);
