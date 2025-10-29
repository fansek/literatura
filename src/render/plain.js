import { relative } from 'node:path';
import { sort } from 'd3-array';

/**
 * @param {Map<string, Set<string>>} graph
 * @param {string} baseDir a base dir path
 */
const render = (graph, baseDir) => {
  sort(graph, ([k]) => k).forEach(([k, vs]) => {
    if (vs.size === 0) {
      return;
    }
    const kFormatted = relative(baseDir, k);
    sort(vs).forEach((v) =>
      process.stdout.write(`${kFormatted}\t${relative(baseDir, v)}\n`),
    );
  });
};

export default render;
