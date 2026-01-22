import { defineConfig, globalIgnores } from "eslint/config";
import meteor from "eslint-plugin-meteor";
import globals from "globals";
import babelParser from "@babel/eslint-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import ydnlu from "eslint-plugin-you-dont-need-lodash-underscore";
import nfp from "eslint-plugin-no-floating-promise";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([globalIgnores([
    "**/node_modules",
    "**/.meteor",
    "libs/3rdparty",
    "imports/platform/client/js/editor/ajooEditor/ajoo/layoutEngine.js",
    "imports/platform/client/js/editor/ajooEditor/ajoo/layoutEngine.max.js",
    "imports/platform/client/js/editor/ajooEditor/ajoo/layoutEngine.min.js",
    "imports/platform/client/js/editor/ajooEditor/ajoo/elements/Lines/routing/IntersectionUtilities.js",
    "imports/custom/vq/client/js/vq_grammar_parser.js",
    "imports/custom/vq/client/js/vq_grammar_completion_parser.js",
    "imports/custom/vq/client/js/vq_visual_grammar_parser.js",
    "imports/custom/vq/client/js/vq_attribute_condition_grammar_parser.js",
    "imports/custom/vq/client/js/vq_variable_grammar_parser.js",
    "imports/custom/vq/client/js/vq_property_path_grammar_parser.js",
    "imports/custom/vq/client/js/vq_property_path_grammar_completion_parser.js",
    "imports/custom/vq/client/js/vq_language_grammar_completion_parser.js",
    "imports/custom/vq/client/js/generateSQL.js",
    "imports/platform/client/js/editor/ajooEditor/ajoo/*",
  ]), {
    extends: compat.extends("eslint:recommended"),

    plugins: {
        meteor,
        nfp,
        ydnlu,
    },

    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.node,
            ...globals.meteor,
            ...globals.jest,
            Meteor: false,
            Npm: false,
            Session: false,
            // Template: false,
            BlazeLayout: false,
            ReactiveVar: false,
            $: false,
            _: false,
            Konva: false,
            YASQE: false,
            Restivus: false,
            xml2js: false,
            IMCSLayout: false,
            TAPi18n: false,
            pdfMake: false,
        },

        parser: babelParser,
        ecmaVersion: "latest",
        sourceType: "module",
    },

    settings: {
        "import/resolver": "meteor",
    },

    rules: {
        "no-unused-vars": 0,
        "no-empty": 0,
        "no-useless-escape": 0,
        "no-extra-semi": 0,
        "no-mixed-spaces-and-tabs": 0,
        "require-await": 1,
        "nfp/no-floating-promise": 1,
        // "ydnlu/each": 1,
        // "ydnlu/map": 1,
        // "ydnlu/keys": 1,
        // "ydnlu/filter": 1,
        // "ydnlu/size": 1,
        // "ydnlu/find": 1,
        // "ydnlu/is-undefined": 1,
    },

}]);
