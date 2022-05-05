# File Path Topological Sort

File Path Topological Sort - useful for reading large codebases.

## Examples Of Usage

First, you need to create file path dependencies and then you can run file path
topological sort on them.

To create file path dependencies for a javascript project, you may try following
steps:

Install

- [dependency-cruiser](https://www.npmjs.com/package/dependency-cruiser)
- [jq](https://stedolan.github.io/jq/manual/)

Run

```sh
depcruise --init
depcruise --config .dependency-cruiser.js -T json -x '/(node_modules|dist|lib)/' . > deps.json
cat deps.json | jq '.modules | [.[] | .source as $source | .dependencies | .[] | select(.coreModule or .couldNotResolve | not) | .resolved | {v: $source, w: .}] | sort' > deps-consolidated.json
```

Note that `depcruise --init` is run in interactive mode.
