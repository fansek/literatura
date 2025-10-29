# Next steps

## Dependency Extraction

We may create plugin architecture with different implementations of dependency
extractors.

Plugins for dependencies extraction:

- compile-time
  - ts-simple (internal)
- run-time
  - node hook which will record all resolutions when they happen while importing
    modules

## Metrics to Measure

I would like literatura to become a dependency graph analysis tool.
It should measure various graph properties in order to give user insight into
how is the code structured.

Properties it should measure:

- graph/subgraph
  - order (number of vertices)
  - size (number of edges)
  - minimum/maximum degree
  - longest path and its length
- vertex/node
  - degree (indegree, outdegree, `deg(v)`)
  - [centrality](https://en.wikipedia.org/wiki/Centrality)
  - minimum and maximum index of vertex in topological order
- edge
  - weight (depends on number of module dependencies)

## Topological Sorting

Sorting, which should be implemented:
https://www.geeksforgeeks.org/lexicographically-smallest-topological-ordering/

## The Algorithm

How it should work:

1. find tsconfig.json if not specified directly
2. read all files which are included in project (with the help of tsconfig.json)
   if not specified directly
3. parse all files with typescript and find all imports
4. generate a store file (something like `.literatura-store`), which will store
   dependencies and will be used when triggered again if it is reasonably fresh
5. analyze dependencies according to the generated dependency graph (either
   retrieved from the store or directly from generated previous parse operation)
