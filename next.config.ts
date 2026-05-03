import type { NextConfig } from 'next';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: 'standalone',
  typedRoutes: true,
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  outputFileTracingRoot: join(projectDir, '..'),
};

export default nextConfig;
