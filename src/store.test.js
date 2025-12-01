import assert from 'node:assert';
import { it } from 'node:test';
import { deserialize, serialize } from './store.js';
import PKG_VERSION from './version.js';

const commonProps = { version: PKG_VERSION };
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
    deserialize(
      { ...commonProps, files: [], refs: [], runtimeRefs: [] },
      baseDir,
    ),
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
        runtimeRefs: [[0, 1], [1]],
      },
      baseDir,
    ),
    new Map([
      [
        '/path/to/a.js',
        {
          refs: new Map([
            ['/path/to/b.js', { isRuntime: true }],
            ['/path/to/c.js', { isRuntime: false }],
          ]),
        },
      ],
      [
        '/path/to/b.js',
        { refs: new Map([['/path/to/c.js', { isRuntime: false }]]) },
      ],
    ]),
  );
});

it('deserializes what was serialized before', () => {
  const s = new Map([
    [
      '/path/to/a.js',
      {
        refs: new Map([
          ['/path/to/b.js', { isRuntime: true }],
          ['/path/to/c.js', { isRuntime: false }],
        ]),
      },
    ],
    ['/path/to/b.js', { refs: new Map() }],
  ]);
  assert.deepEqual(deserialize(serialize(s, baseDir), baseDir), s);
});

it('serializes a map into a store', () => {
  assert.deepEqual(
    serialize(
      new Map([
        [
          '/path/to/a.js',
          {
            refs: new Map([
              ['/path/to/b.js', { isRuntime: true }],
              ['/path/to/c.js', {}],
            ]),
          },
        ],
        ['/path/to/b.js', { refs: new Map() }],
      ]),
      baseDir,
    ),
    {
      ...commonProps,
      files: ['to/a.js', 'to/b.js', 'to/c.js'],
      refs: [[0, 1, 2], [1]],
      runtimeRefs: [[0, 1], [1]],
    },
  );
});
