#!/usr/bin/env node

import { createRequire } from 'node:module';
import * as path from 'node:path';
import * as commander from 'commander';
import { parseDependencyTree } from 'dpdm';
import escapeHTML from 'escape-html';
import { formDirNode, getSortedSccsByComponent } from './dir-node.js';

const require = createRequire(import.meta.url);

/**
 * @typedef {import('./dir-node.js').DirNode} DirNode
 * @typedef {DirNode['dependencies']} Dependencies
 */

/**
 * @template T
 * @param {T | null} value
 * @returns {value is T & {}}
 */
const isNotNull = (value) => value != null;

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
 * @returns {string}
 */
const link = (value) => `<a>${escapeHTML(value)}</a>`;

/**
 * @param {string[][]} sccs
 * @param {Dependencies} dependencies
 * @param {string} depsRoot
 * @returns {string}
 */
const sccsToString = (sccs, dependencies, depsRoot) => {
  /** @type {(edge: [string, string]) => string} */
  const edgeToString = ([tail, head]) => {
    const relativeTail = link(path.relative(depsRoot, tail));
    const relativeHead = link(path.relative(depsRoot, head));
    return `    - ${relativeTail} → ${relativeHead}`;
  };
  const cyclicDeps = new Set(sccs.flatMap(
    (scc) => (scc.length > 1 ? scc : []),
  ));
  /** @type {(value: string) => string} */
  const decoratedLink = (value) => (
    cyclicDeps.has(value)
      ? `*${link(value)}* (!)`
      : link(value)
  );

  return sccs
    .map((scc) => scc
      .map((node) => {
        const nodeStr = `- ${decoratedLink(node)}`;
        const deps = dependencies.get(node);
        const depsStr = deps == null
          ? ''
          : `\n${[...deps]
            .map(
              ([other, files]) => {
                if (files.length === 1) {
                  const [tail, head] = files[0];
                  if (
                    node === path.relative(depsRoot, tail)
                      && other === path.relative(depsRoot, head)
                  ) {
                    return `  - ↘ ${decoratedLink(other)}`;
                  }
                }
                return (
                  `  - ↘ ${decoratedLink(other)}\n${
                    [...files].map(edgeToString).join('\n')
                  }`
                );
              },
            )
            .join('\n')}`;
        return `${nodeStr}${depsStr}`;
      })
      .join('\n'))
    .join('\n');
};

/**
 * @param {string[][][]} sccsByComponent
 * @param {Dependencies} dependencies
 * @param {string} depsRoot
 * @returns {string}
 */
const sccsByComponentToString = (
  sccsByComponent,
  dependencies,
  depsRoot,
) => sccsByComponent
  .map((sccs) => sccsToString(sccs, dependencies, depsRoot))
  .join('\n\n---\n\n');

/**
 * @param {DirNode} dirNode
 * @param {string} depsRoot
 * @returns {string}
 */
const dirNodeToString = (dirNode, depsRoot) => {
  const nonTrivial = findHighestNonTrivialDescendant(dirNode);
  // do not print anything for leaf nodes (modules, files)
  // or trivial nodes (with single descendant only)
  if (nonTrivial == null) {
    return '';
  }

  const { dependencies, fullName, subnodes } = nonTrivial;

  const sccsByComponent = getSortedSccsByComponent(nonTrivial);

  const childrenStr = sccsByComponent
    .flat()
    .flat()
    .map((name) => dirNodeToString(
      /** @type {DirNode} */ (subnodes.get(name)),
      depsRoot,
    ))
    .filter(Boolean)
    .join('\n\n');

  const dirNodeStr = `${childrenStr && '\n\n'}# ${
    link(path.relative(depsRoot, fullName)) || '.'
  }\n\n${
    sccsByComponentToString(sccsByComponent, dependencies, nonTrivial.fullName)
  }`;

  return childrenStr + dirNodeStr;
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
        .map(
          /** @type {(id: string) => [string, string]} */
          (id) => [path.resolve(from), path.resolve(id)],
        ),
    );
  const dirNode = formDirNode(edges);
  const depsRoot = findHighestNonTrivialDescendant(dirNode);
  if (depsRoot === undefined) {
    throw new Error(`No deps root was found: ${dirNode}`);
  }

  console.log(dirNodeToString(depsRoot, depsRoot.fullName));
};

const { program } = commander;
program
  .name('literatura')
  .description(
    'CLI to build topologically ordered literature from code '
    + 'with respect for code directory structure.',
  )
  .argument('<entries...>', 'entries for dependency tree traversal (see manual for dpdm)');

program.parse();

const entries = program.args;

printDeps(entries);
