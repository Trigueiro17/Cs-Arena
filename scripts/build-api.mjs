import * as esbuild from 'esbuild';

const commonOptions = {
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  external: ['@node-rs/argon2'],
  banner: {
    js: `import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
`,
  },
};

async function build() {
  await esbuild.build({
    ...commonOptions,
    entryPoints: ['server/index.ts'],
    outfile: 'api/index.js',
  });

  await esbuild.build({
    ...commonOptions,
    entryPoints: ['server/[...path].ts'],
    outfile: 'api/[...path].js',
  });

  console.log('Serverless functions built successfully with createRequire banner.');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
