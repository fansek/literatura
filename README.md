# literatura

literatura - a tool for reading large codebases.

It is useful mainly in large codebases to extract relationships between files
and directories.

## Installing

To install literatura, run `pnpm add -g literatura`. For development purposes,
run `pnpm link -g` from the package directory.

To uninstall literatura, run `pnpm uninstall -g literatura`.

## Running

Run `lit -h` to learn how to use `literatura`.

## Terminology

`node` represents a file or a directory (depends on context).
`edge` is a link from source (`src`) node to reference (`ref`) node.

## Acknowledgements

literatura was inspired by

- [dpdm](https://github.com/acrazing/dpdm) for dependency list retrieval.
