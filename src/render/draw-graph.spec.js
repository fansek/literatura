import { expect, it } from 'vitest';
import drawGraph, {
  CONT_AFTER_SRC,
  CONT_BEFORE_SRC,
  DST_AFTER_SRC,
  DST_BEFORE_SRC,
  DST_MAX,
  DST_MIN,
  SRC,
  SRC_MAX,
  SRC_MIN,
  VACUUM,
} from './draw-graph.js';

/**
 * @param {Iterable<[string, string[]]>} entries
 */
const doRender = (entries) => {
  const mapping = new Map(entries);
  return drawGraph([...mapping.keys()], (src) => mapping.get(src) ?? []);
};

it('renders links', () => {
  expect(
    doRender([
      ['a', []],
      ['b', ['a']],
    ]),
  ).toEqual([DST_MIN, SRC_MAX]);
});

it('renders circular links', () => {
  expect(
    doRender([
      ['a', ['b']],
      ['b', ['a']],
    ]),
  ).toEqual([DST_MIN + SRC_MIN, SRC_MAX + DST_MAX]);
});

it('renders links, complex scenario', () => {
  expect(
    doRender([
      ['a', []],
      ['b', ['a']],
      ['c', ['a', 'b', 'd', 'e']],
      ['d', ['c', 'f']],
      ['e', ['c']],
      ['f', []],
    ]),
  ).toEqual([
    VACUUM + DST_MIN + DST_MIN,
    VACUUM + DST_BEFORE_SRC + SRC_MAX,
    DST_MIN + SRC + DST_MIN,
    CONT_BEFORE_SRC + DST_AFTER_SRC + SRC,
    SRC_MAX + DST_MAX + CONT_AFTER_SRC,
    VACUUM + VACUUM + DST_MAX,
  ]);
});
