import assert from 'node:assert';
import { it } from 'node:test';
import { deserialize, serialize } from './store.js';
import pkg from '../package.json' with { type: 'json' };

const commonProps = { version: pkg.version };
const baseDir = '/path';

it('does not deserialize an invalid store', () => {
  assert.strictEqual(deserialize({ ...commonProps }, baseDir), undefined);
  assert.strictEqual(
    deserialize({ ...commonProps, files: [1, 2, 3], refs: [] }, baseDir),
    undefined,
  );
  assert.strictEqual(
    deserialize({ ...commonProps, files: [], refs: [[]] }, baseDir),
    undefined,
  );
  assert.strictEqual(
    deserialize(
      { ...commonProps, files: ['to/a/file'], refs: [[1, 2]] },
      baseDir,
    ),
    undefined,
  );
  assert.strictEqual(deserialize({ files: [], refs: [] }, baseDir), undefined);
});

it('deserializes a valid empty store', () => {
  assert.deepEqual(
    deserialize({ ...commonProps, files: [], refs: [] }, baseDir),
    new Map(),
  );
});

it('deserializes a valid non-empty store', () => {
  assert.deepEqual(
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
  assert.deepEqual(deserialize(serialize(graph, baseDir), baseDir), graph);
});

it('serializes a map into a store', () => {
  assert.deepEqual(
    serialize(
      new Map([
        ['/path/to/a.js', new Set(['/path/to/b.js', '/path/to/c.js'])],
        ['/path/to/b.js', new Set([])],
      ]),
      baseDir,
    ),
    {
      ...commonProps,
      files: ['to/a.js', 'to/b.js', 'to/c.js'],
      refs: [[0, 1, 2], [1]],
    },
  );
});
