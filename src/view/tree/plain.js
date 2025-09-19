import { findHighestNonTrivialDescendant } from '../../dir.js';

/**
 * @typedef {import('../../dir.js').Dir} Dir
 * @typedef {Dir['dependencies']} Dependencies
 */

/**
 * @param {Dir} rootNode
 * @param {string} baseDir a base dir path
 */
const render = (rootNode, baseDir) => {
  const nonTrivialRootNode = findHighestNonTrivialDescendant(rootNode);

  process.stdout.write('\n');
};

export default render;
