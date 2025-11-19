import assert from 'node:assert';
import { it } from 'node:test';
import drawDiagram, {
  CONT_AFTER_SRC,
  CONT_BEFORE_SRC,
  REF_AFTER_SRC,
  REF_BEFORE_SRC,
  REF_MAX,
  REF_MIN,
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
  assert.deepEqual(
    doDraw([
      ['a', []],
      ['b', ['a']],
    ]),
    [REF_MIN, SRC_MAX],
  );
});

it('draws diagram with circular refs', () => {
  assert.deepEqual(
    doDraw([
      ['a', ['b']],
      ['b', ['a']],
    ]),
    [REF_MIN + SRC_MIN, SRC_MAX + REF_MAX],
  );
});

it('draws diagram, complex scenario', () => {
  assert.deepEqual(
    doDraw([
      ['a', []],
      ['b', ['a']],
      ['c', ['a', 'b', 'd', 'e']],
      ['d', ['c', 'f']],
      ['e', ['c']],
      ['f', []],
    ]),
    [
      VACUUM + REF_MIN + REF_MIN,
      VACUUM + REF_BEFORE_SRC + SRC_MAX,
      REF_MIN + SRC + REF_MIN,
      CONT_BEFORE_SRC + REF_AFTER_SRC + SRC,
      SRC_MAX + REF_MAX + CONT_AFTER_SRC,
      VACUUM + VACUUM + REF_MAX,
    ],
  );
});
