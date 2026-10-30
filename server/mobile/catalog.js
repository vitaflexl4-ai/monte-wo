// The exercises catalog: one JSON source, two loaders.
// Node requires the `with` import attribute for JSON modules; that attribute syntax
// cannot be parsed by the older esbuild bundled inside Cloudflare Pages' build image
// (wrangler 3.114). Every esbuild version, old or new, inlines a BARE dynamic import
// of a literal specifier — so the Workers path uses that, and only the Node path uses
// the attributed form. The branch that does not run is dead code in the bundle.
let catalog;
if (typeof WebSocketPair === 'undefined') {
  // Node (tests, direct execution): JSON modules need the import attribute.
  ({ default: catalog } = await import('../../content/exercises.json', { with: { type: 'json' } }));
} else {
  // Workers runtime: bare dynamic import — inlined by esbuild at build time.
  catalog = (await import('../../content/exercises.json')).default;
}
export default catalog;
