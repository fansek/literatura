import { styleText } from 'node:util';
import { min, max, range } from 'd3-array';

export const VACUUM = '  ';
export const CONT_BEFORE_SRC = '│ ';
export const CONT_AFTER_SRC = '┃ ';
export const REF_BEFORE_SRC = '├' + styleText('green', '>');
export const REF_MIN = '┌' + styleText('green', '>');
export const REF_AFTER_SRC = '┣' + styleText('red', '>');
export const REF_MAX = '┗' + styleText('red', '>');
export const SRC = '┟' + styleText('yellow', '@');
export const SRC_MIN = '┎' + styleText('yellow', '@');
export const SRC_MAX = '└' + styleText('yellow', '@');

/**
 * @param {number} src
 * @param {Set<number>} refs
 * @returns {[number, number]}
 */
const getIndexRange = (src, refs) => {
  const allIndices = [src, ...refs];
  const minIndex = /** @type {number} */ (min(allIndices));
  const maxIndex = /** @type {number} */ (max(allIndices));
  return [minIndex, maxIndex];
};

/**
 * @param {number} srcIndex
 * @param {Set<number>} refIndices
 * @param {[number, number]} indexRange
 * @param {string[]} [origColumn]
 */
const drawColumn = (srcIndex, refIndices, indexRange, origColumn = []) => {
  if (refIndices.size === 0) {
    return origColumn;
  }
  const [minIndex, maxIndex] = indexRange;
  const emptySpace = range(minIndex - origColumn.length).map(() => VACUUM);
  const newRange = range(minIndex, maxIndex + 1).map((index) => {
    if (index === srcIndex) {
      if (index === minIndex) {
        return SRC_MIN;
      }
      if (index === maxIndex) {
        return SRC_MAX;
      }
      return SRC;
    }
    if (index < srcIndex) {
      if (!refIndices.has(index)) {
        return CONT_BEFORE_SRC;
      }
      if (index === minIndex) {
        return REF_MIN;
      }
      return REF_BEFORE_SRC;
    }
    if (!refIndices.has(index)) {
      return CONT_AFTER_SRC;
    }
    if (index === maxIndex) {
      return REF_MAX;
    }
    return REF_AFTER_SRC;
  });
  return [...origColumn, ...emptySpace, ...newRange];
};

/**
 * @param {string[]} srcs sources
 * @param {(src: string) => Iterable<string>} getRefs get references by source
 */
const drawDiagram = (srcs, getRefs) => {
  const indexBySrc = new Map(srcs.map((src, index) => [src, index]));
  /** @type {string[][]} */
  const columns = [];

  srcs.forEach((src, index) => {
    const refIndices = new Set(
      [...getRefs(src)]
        .map((ref) => indexBySrc.get(ref))
        .filter((refIndex) => refIndex != null),
    );
    const indexRange = getIndexRange(index, refIndices);
    const [minIndex] = indexRange;
    const minCol = columns.findIndex((col) => col.length <= minIndex);
    if (minCol === -1) {
      columns.push(drawColumn(index, refIndices, indexRange));
    } else {
      columns[minCol] = drawColumn(
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

export default drawDiagram;
