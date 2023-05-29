import { copyFileSync } from 'fs';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig(({ command }) => {
    if (command === 'build') {
        return {
            build: {
                lib: {
                    entry: 'src/hierarchy-list.ts', // Entry point for your package source files
                    name: 'hierarchy-list', // Name of your package (for UMD/IIFE builds)
                    formats: ['es', 'cjs', 'umd'],
                    fileName: 'hierarchy-list',
                },
                copyPublicDir: false,
                rollupOptions: {
                    output: {
                        exports: 'named',
                    },
                    treeshake: false
                },
            },
            plugins: [
                dts(),
                {
                    name: "copy-styles",
                    writeBundle(){
                        copyFileSync('src/style.css', 'dist/style.css');
                    }
                }
            ],
        };
    } else {
        return {};
    }
});
