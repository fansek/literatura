import { expect, it } from 'vitest';
import { deserialize, serialize } from './cache.js';
import pkg from '../package.json' with { type: 'json' };

const commonProps = { version: pkg.version };
const baseDir = '/path';

it('does not deserialize an invalid cache', () => {
  expect(deserialize({ ...commonProps }, baseDir)).toBeUndefined();
  expect(
    deserialize({ ...commonProps, files: [1, 2, 3], refs: [] }, baseDir),
  ).toBeUndefined();
  expect(
    deserialize({ ...commonProps, files: [], refs: [[]] }, baseDir),
  ).toBeUndefined();
  expect(
    deserialize(
      { ...commonProps, files: ['to/a/file'], refs: [[1, 2]] },
      baseDir,
    ),
  ).toBeUndefined();
  expect(deserialize({ files: [], refs: [] }, baseDir)).toBeUndefined();
});

it('deserializes a valid empty cache', () => {
  expect(deserialize({ ...commonProps, files: [], refs: [] }, baseDir)).toEqual(
    new Map(),
  );
});

it('deserializes a valid non-empty cache', () => {
  expect(
    deserialize(
      {
        ...commonProps,
        files: ['to/a.js', 'to/b.js', 'to/c.js'],
        refs: [
          [0, 1, 2],
          [1, 2],
        ],
      },
      baseDir,
    ),
  ).toEqual(
    new Map([
      ['/path/to/a.js', new Set(['/path/to/b.js', '/path/to/c.js'])],
      ['/path/to/b.js', new Set(['/path/to/c.js'])],
    ]),
  );
});

it('deserializes what was serialized before', () => {
  const graph = new Map([
    ['/path/to/a.js', new Set(['/path/to/b.js', '/path/to/c.js'])],
    ['/path/to/b.js', new Set([])],
  ]);
  expect(deserialize(serialize(graph, baseDir), baseDir)).toEqual(graph);
});

it('serializes a map into a cache', () => {
  expect(
    serialize(
      new Map([
        ['/path/to/a.js', new Set(['/path/to/b.js', '/path/to/c.js'])],
        ['/path/to/b.js', new Set([])],
      ]),
      baseDir,
    ),
  ).toEqual({
    ...commonProps,
    files: ['to/a.js', 'to/b.js', 'to/c.js'],
    refs: [[0, 1, 2], [1]],
  });
});
