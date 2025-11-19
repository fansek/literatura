import pkg from '../package.json' with { type: 'json' };

const PKG_VERSION = pkg.version;

export default PKG_VERSION;
