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
 * @param {string} value
 * @returns {import('mdast').Link}
 */
const link = (value) => u('link', { url: '' }, [u('text', value)]);

/**
 * @param {string[][]} sccs
 * @param {Dependencies} dependencies
 * @param {string} depsRoot
 * @returns {import('mdast').List}
 */
const sccsToMdast = (sccs, dependencies, depsRoot) => {
  /**
   * @param {Edge} edge
   * @returns {import('mdast').ListItem}
   */
  const edgeToMdast = ({ tail, head }) => u('listItem', [
    u('paragraph', [
      link(path.relative(depsRoot, tail)),
      u('text', ' → '),
      link(path.relative(depsRoot, head)),
    ]),
  ]);
  const cyclicDeps = new Set(sccs.flatMap(
    (scc) => (scc.length > 1 ? scc : []),
  ));

  /**
   * @param {string} value
   * @param {boolean} [arrow]
   * @returns {import('mdast').Paragraph}
   */
  const decoratedLink = (value, arrow) => {
    const prefix = arrow ? [u('text', '↘ ')] : [];
    const mainElements = cyclicDeps.has(value)
      ? [u('emphasis', [link(value)]), u('text', ' (!)')]
      : [link(value)];
    return u('paragraph', [...prefix, ...mainElements]);
  };
  return u(
    'list',
    { spread: false },
    sccs
      .flatMap((scc) => scc
        .map((node) => {
          const deps = dependencies.get(node);
          return u(
            'listItem',
            { spread: false },
            [
              decoratedLink(node),
              ...(deps == null || deps.size === 0
                ? []
                : [
                  u(
                    'list',
                    { spread: false },
                    [...deps]
                      .map(
                        ([other, files]) => {
                          if (files.length === 1) {
                            const { tail, head } = files[0];
                            if (
                              node === path.relative(depsRoot, tail)
                            && other === path.relative(depsRoot, head)
                            ) {
                              return u(
                                'listItem',
                                { spread: false },
                                [decoratedLink(other, true)],
                              );
                            }
                          }
                          return u(
                            'listItem',
                            { spread: false },
                            [
                              decoratedLink(other, true),
                              u(
                                'list',
                                { spread: false },
                                files.map(edgeToMdast),
                              ),
                            ],
                          );
                        },
                      ),
                  ),
                ]),
            ],
          );
        })),
  );
};

/**
 * @param {string[][][]} sccsByComponent
 * @param {Dependencies} dependencies
 * @param {string} depsRoot
 * @returns {import('mdast').RootContent[]}
 */
const sccsByComponentToMdast = (
  sccsByComponent,
  dependencies,
  depsRoot,
) => sccsByComponent
  .flatMap(
    (sccs) => [sccsToMdast(sccs, dependencies, depsRoot), u('thematicBreak')],
  )
  .slice(0, -1);

/**
 * @param {DirNode} dirNode
 * @param {string} depsRoot
 * @returns {import('mdast').RootContent[]}
 */
const dirNodeToMdast = (dirNode, depsRoot) => {
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
      depsRoot,
    ));

  const dirNodeHeading = u(
    'heading',
    { depth: /** @type {1} */ (1) },
    [link(path.relative(depsRoot, fullName) || '.')],
  );
  const dirNodeContent = sccsByComponentToMdast(
    cs,
    dependencies,
    nonTrivial.fullName,
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
  const depsRoot = findHighestNonTrivialDescendant(dirNode);
  if (depsRoot === undefined) {
    throw new Error(`No deps root was found: ${dirNode}`);
  }

  const resultMdast = u('root', dirNodeToMdast(depsRoot, depsRoot.fullName));
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
