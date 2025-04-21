import formDir from './dir.js';
import renderMarkdown from './view/tree/markdown.js';
import parse from './parser/dpdm.js';

/**
 * @param {string[]} entries
 * @param {string} workingDir
 * @param {boolean} transform
 * @returns {Promise<void>}
 */
const printDeps = async (entries, workingDir, transform) => {
  const graph = await parse(entries, transform);
  const dir = formDir(graph);
  console.log(renderMarkdown(dir, workingDir));
};

export default printDeps;
