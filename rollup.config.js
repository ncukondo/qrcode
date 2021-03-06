import commonjs from "rollup-plugin-commonjs";
import livereload from "rollup-plugin-livereload";
import postcss from "rollup-plugin-postcss";
import resolve from "rollup-plugin-node-resolve";
import svelte from "rollup-plugin-svelte";
import { terser } from "rollup-plugin-terser";
import svelte_preprocess_postcss from "svelte-preprocess-postcss";
import builtins from "rollup-plugin-node-builtins";
import globals from "rollup-plugin-node-globals";
import copy from "rollup-plugin-copy-assets";

const production = !process.env.ROLLUP_WATCH;
export default {
  input: "src/main.js",
  output: {
    format: "esm",
    sourcemap: true,
    name: "app",
    dir: "public/bundle/"
  },

  plugins: [
    svelte({
      dev: !production,
      preprocess: {
        style: svelte_preprocess_postcss()
      },
      css: css => {
        css.write("public/components.css");
      }
    }),
    resolve({
      preferBuiltins: true, browser: true,
      dedupe: importee => importee === 'svelte' || importee.startsWith('svelte/'),
    }),
    commonjs(),
    globals(),
    builtins(),
    copy({
      assets: ["src/assets"]
    }),
    postcss({
      extract: true, plugins: [require('tailwindcss'),
      require('autoprefixer'),]
    }),
    !production && livereload("public"),
    production && terser()
  ]

};
