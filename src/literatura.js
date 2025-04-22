import formDir from './dir.js';
import renderMarkdown from './view/tree/markdown.js';
import parse from './parser.js';

/**
 * @param {string[]} entries
 * @param {string} workingDir
 * @returns {Promise<void>}
 */
const literatura = async (entries, workingDir = process.cwd()) => {
  const graph = await parse(entries.length === 0 ? [workingDir] : entries);
  const dir = formDir(graph);
  console.log(renderMarkdown(dir, workingDir));
};

export default literatura;
