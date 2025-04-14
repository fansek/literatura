import { describe, it, expect } from 'vitest';
import { InternMap } from 'd3-array';
import { flatten, reverse } from './topo.js';

describe('reverse edges', () => {
  it('should flatten edges', () => {
    expect(
      flatten(
        new Map([
          ['a', ['b']],
          ['b', ['c', 'd']],
        ]),
        (tail, head) => [tail, head],
      ),
    ).toEqual([
      ['a', 'b'],
      ['b', 'c'],
      ['b', 'd'],
    ]);
  });

  it('should reverse edges', () => {
    expect(
      reverse(
        new Map([
          ['a', ['b']],
          ['b', ['c', 'd']],
        ]),
      ),
    ).toEqual(
      new InternMap([
        ['b', ['a']],
        ['c', ['b']],
        ['d', ['b']],
      ]),
    );
  });
});
