import renderGraph from './render-graph.js';
import { read } from './store.js';

/**
 * @typedef {{
 *   entries?: string[];
 *   baseDir: string;
 *   storePath?: string;
 *   nodeFormat?: string;
 *   edgeFormat?: string;
 * }} RenderProps
 * @param {RenderProps} options
 */
const render = async ({
  entries = [],
  baseDir,
  storePath,
  nodeFormat,
  edgeFormat,
}) => {
  const storeReadResult = await read(baseDir, storePath);
  if (storeReadResult.status === 'rejected') {
    return storeReadResult;
  }
  renderGraph(storeReadResult.value, baseDir, entries, {
    nodeFormat,
    edgeFormat,
  });
  return { status: /** @type {const} */ ('fulfilled') };
};

export default render;
