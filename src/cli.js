import parseArgs from './args.js';

const run = async () => {
  const args = parseArgs();
  if (args.mode === 'build') {
    const build = (await import('./build.js')).default;
    const buildResult = await build(args);
    if (buildResult.status === 'rejected') {
      console.error(`Build failed: ${buildResult.reason}`);
      return 1;
    }
    console.error(`Build succeeded.`);
    return 0;
  }
  if (args.mode === 'render') {
    const render = (await import('./render.js')).default;
    const renderResult = await render(args);
    if (renderResult.status === 'rejected') {
      console.error(`Render failed: ${renderResult.reason}`);
      return 1;
    }
    return 0;
  }
  throw new Error(`Unexpected args: ${args}`);
};

const code = await run();
process.exit(code);
