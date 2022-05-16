// prettier-ignore
import type { UserConfigFn, UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import tsconfigPaths from 'vite-tsconfig-paths';
import mkcert from 'vite-plugin-mkcert';

const defineConfig: UserConfigFn = ({ command, mode }) => {
  const config: UserConfig = {
    server: {
      port: 80,
      https: false,

      proxy: {
        '^/api/.*': {
          target: 'http://apache:80',
          changeOrigin: false,
        },

        '^/media/.*': {
          target: 'http://apache:80',
          changeOrigin: false,
          //   rewrite: (path) => path.replace(^/a, '')
        },
      },
    },
    resolve: {
      alias: {
        '@Tool': '/src/Tools/_framework/Tool',
        '@Toast': '/src/Tools/_framework/Toast',
        'solid-svg': '@fortawesome/free-solid-svg-icons',
        'react-spring': '@react-spring/web',
      },
    },
    plugins: [
      react({
        babel: {
          presets: ['@babel/preset-react'],
        },
      }),
      tsconfigPaths(),
      legacy(),
      mkcert({
        source: 'coding',
      }),
    ],
    root: './src/',
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react'],
            'react-dom': ['react-dom'],
          },
        },
      },
    },
  };
  return config;
};

export default defineConfig;
