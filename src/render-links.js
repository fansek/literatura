import { styleText } from 'node:util';
import { min, max, range } from 'd3-array';

export const VACUUM = '  ';
export const CONT_BEFORE_SRC = '│ ';
export const CONT_AFTER_SRC = '┃ ';
export const DST_BEFORE_SRC = '├' + styleText('green', '>');
export const DST_MIN = '┌' + styleText('green', '>');
export const DST_AFTER_SRC = '┣' + styleText('red', '>');
export const DST_MAX = '┗' + styleText('red', '>');
export const SRC = '┟' + styleText('yellow', '@');
export const SRC_MIN = '┎' + styleText('yellow', '@');
export const SRC_MAX = '└' + styleText('yellow', '@');

/**
 * @param {number} src
 * @param {Set<number>} dsts
 * @return {[number, number]}
 */
const getIndexRange = (src, dsts) => {
  const allIndices = [src, ...dsts];
  const minIndex = /** @type {number} */ (min(allIndices));
  const maxIndex = /** @type {number} */ (max(allIndices));
  return [minIndex, maxIndex];
};

/**
 * @param {number} src
 * @param {Set<number>} dsts
 * @param {[number, number]} indexRange
 * @param {string[]} [origColumn]
 */
const renderColumn = (src, dsts, indexRange, origColumn = []) => {
  if (dsts.size === 0) {
    return origColumn;
  }
  const [minIndex, maxIndex] = indexRange;
  const emptySpace = range(minIndex - origColumn.length).map(() => VACUUM);
  const newRange = range(minIndex, maxIndex + 1).map((index) => {
    if (index === src) {
      if (index === minIndex) {
        return SRC_MIN;
      }
      if (index === maxIndex) {
        return SRC_MAX;
      }
      return SRC;
    }
    if (index < src) {
      if (!dsts.has(index)) {
        return CONT_BEFORE_SRC;
      }
      if (index === minIndex) {
        return DST_MIN;
      }
      return DST_BEFORE_SRC;
    }
    if (!dsts.has(index)) {
      return CONT_AFTER_SRC;
    }
    if (index === maxIndex) {
      return DST_MAX;
    }
    return DST_AFTER_SRC;
  });
  return [...origColumn, ...emptySpace, ...newRange];
};

/**
 * @param {string[]} srcs
 * @param {(src: string) => Iterable<string>} getRefs
 */
export const render = (srcs, getRefs) => {
  const indexBySrc = new Map(srcs.map((src, index) => [src, index]));
  /** @type {string[][]} */
  const columns = [];

  srcs.forEach((src, index) => {
    const refIndices = new Set(
      [...getRefs(src)]
        .map((dst) => indexBySrc.get(dst))
        .filter((dstIndex) => dstIndex != null),
    );
    const indexRange = getIndexRange(index, refIndices);
    const [minIndex] = indexRange;
    const minCol = columns.findIndex((col) => col.length <= minIndex);
    if (minCol === -1) {
      columns.push(renderColumn(index, refIndices, indexRange));
    } else {
      columns[minCol] = renderColumn(
        index,
        refIndices,
        indexRange,
        columns[minCol],
      );
    }
  });

  return srcs.map((_, index) =>
    columns
      .map((col) => col[index] ?? VACUUM)
      .reverse()
      .join(''),
  );
};

export default render;
