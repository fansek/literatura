import literatura from './literatura.js';
import parseArgs from './args.js';

const args = parseArgs();
await literatura(args.entries, args.options);
