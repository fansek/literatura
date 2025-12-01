import doRender from '../render/render.js';
import { read } from '../store.js';

/**
 * @typedef {{
 *   entries?: string[];
 *   baseDir: string;
 *   storePath?: string;
 *   nodeFormat?: string;
 *   edgeFormat?: string;
 *   runtimeOnly?: boolean;
 * }} RenderProps
 * @param {RenderProps} options
 */
const render = async ({
  entries = [],
  baseDir,
  storePath,
  nodeFormat,
  edgeFormat,
  runtimeOnly,
}) => {
  const storeReadResult = await read(baseDir, storePath);
  if (storeReadResult.status === 'rejected') {
    return storeReadResult;
  }
  doRender(storeReadResult.value, baseDir, entries, {
    nodeFormat,
    edgeFormat,
    runtimeOnly,
  });
  return { status: /** @type {const} */ ('fulfilled') };
};

export default render;
