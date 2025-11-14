import { expect, it } from 'vitest';
import drawDiagram, {
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
} from './draw-diagram.js';

/**
 * @param {Iterable<[string, string[]]>} entries
 */
const doDraw = (entries) => {
  const mapping = new Map(entries);
  return drawDiagram([...mapping.keys()], (src) => mapping.get(src) ?? []);
};

it('draws diagram', () => {
  expect(
    doDraw([
      ['a', []],
      ['b', ['a']],
    ]),
  ).toEqual([DST_MIN, SRC_MAX]);
});

it('draws diagram with circular refs', () => {
  expect(
    doDraw([
      ['a', ['b']],
      ['b', ['a']],
    ]),
  ).toEqual([DST_MIN + SRC_MIN, SRC_MAX + DST_MAX]);
});

it('draws diagram, complex scenario', () => {
  expect(
    doDraw([
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
