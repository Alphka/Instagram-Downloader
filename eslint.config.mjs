import { fileURLToPath } from "url"
import { FlatCompat } from "@eslint/eslintrc"
import { dirname } from "path"
import unusedImports from "eslint-plugin-unused-imports"
import regexpPlugin from "eslint-plugin-regexp"
import stylistic from "@stylistic/eslint-plugin"
import nPlugin from "eslint-plugin-n"
import globals from "globals"
import js from "@eslint/js"

const compat = new FlatCompat({
	baseDirectory: import.meta.dirname ?? dirname(fileURLToPath(import.meta.url))
})

const eslintConfig = [
	js.configs.recommended,
	nPlugin.configs["flat/recommended-script"],
	regexpPlugin.configs["flat/recommended"],
	{
		plugins: {
			js,
			"@stylistic": stylistic,
			"unused-imports": unusedImports
		},
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: "module",
			globals: {
				...globals.node
			}
		}
	},
	...compat.config({
		ignorePatterns: [
			"node_modules",
			".vscode",
			"output",
			"tests/*/*.js",
			"test*.js"
		],
		rules: {
			"array-bracket-spacing": ["error", "never"],
			"array-callback-return": "error",
			"comma-dangle": ["error", "never"],
			"constructor-super": "error",
			"dot-notation": "error",
			"eol-last": ["error", "always"],
			eqeqeq: ["error", "smart"],
			"for-direction": "error",
			"func-name-matching": "error",
			"func-names": ["error", "as-needed"],
			"getter-return": "error",
			"guard-for-in": "error",
			indent: "off",
			"keyword-spacing": ["error", {
				overrides: {
					if: { before: false, after: false },
					else: { before: false, after: false },
					for: { before: false, after: false },
					while: { before: false, after: false },
					do: { before: false, after: false },
					switch: { before: false, after: false },
					try: { after: false },
					catch: { before: false, after: false },
					finally: { before: false, after: false },
					with: { before: false, after: false },
					in: { before: true, after: true },
					of: { before: true, after: true },
					function: { after: false },
					import: { after: true },
					from: { before: true, after: true },
					export: { after: true },
					return: { after: true },
					const: { after: true },
					let: { after: true },
					var: { after: true }
				}
			}],
			"linebreak-style": ["warn", "unix"],
			"no-async-promise-executor": "error",
			"no-case-declarations": "error",
			"no-class-assign": "error",
			"no-compare-neg-zero": "error",
			"no-cond-assign": "error",
			"no-console": ["error",{
				allow: ["warn", "error"]
			}],
			"no-const-assign": "error",
			"no-constant-binary-expression": "error",
			"no-constant-condition": "off",
			"no-control-regex": "error",
			"no-debugger": "error",
			"no-delete-var": "error",
			"no-dupe-args": "error",
			"no-dupe-class-members": "error",
			"no-dupe-else-if": "error",
			"no-dupe-keys": "error",
			"no-duplicate-case": "error",
			"no-else-return": ["error", {
				allowElseIf: false
			}],
			"no-empty": "error",
			"no-empty-character-class": "error",
			"no-empty-pattern": "error",
			"no-empty-static-block": "error",
			"no-ex-assign": "off",
			"no-extra-boolean-cast": "error",
			"no-fallthrough": ["off", {
				allowEmptyCase: true
			}],
			"no-func-assign": "error",
			"no-global-assign": "error",
			"no-implicit-coercion": "off",
			"no-import-assign": "error",
			"no-invalid-regexp": "error",
			"no-irregular-whitespace": "error",
			"no-lonely-if": "error",
			"no-loss-of-precision": "error",
			"no-misleading-character-class": "error",
			"no-multiple-empty-lines": ["error", {
				max: 1,
				maxBOF: 0,
				maxEOF: 1
			}],
			"no-nested-ternary": "off",
			"no-new-native-nonconstructor": "error",
			"no-nonoctal-decimal-escape": "error",
			"no-obj-calls": "error",
			"no-octal": "error",
			"no-prototype-builtins": "error",
			"no-redeclare": "error",
			"no-regex-spaces": "error",
			"no-self-assign": "error",
			"no-setter-return": "error",
			"no-shadow": "off",
			"no-shadow-restricted-names": "error",
			"no-sparse-arrays": "error",
			"no-this-before-super": "error",
			"no-undef": "off",
			"no-unexpected-multiline": "error",
			"no-unneeded-ternary": "error",
			"no-unreachable": "error",
			"no-unsafe-finally": "error",
			"no-unsafe-negation": "error",
			"no-unsafe-optional-chaining": "error",
			"no-unused-labels": "error",
			"no-unused-private-class-members": "error",
			"no-unused-vars": "off",
			"no-use-before-define": ["error", "nofunc"],
			"no-useless-backreference": "error",
			"no-useless-catch": "error",
			"no-useless-escape": "error",
			"no-useless-return": "error",
			"no-var": "error",
			"no-with": "error",
			"object-curly-spacing": ["error", "always"],
			"object-shorthand": "error",
			"one-var": ["error", "never"],
			"operator-assignment": "error",
			"prefer-arrow-callback": "off",
			"prefer-const": "error",
			"prefer-object-spread": "error",
			"prefer-regex-literals": "error",
			"prefer-rest-params": "error",
			"prefer-spread": "error",
			"prefer-template": "off",
			quotes: "off",
			"require-yield": "error",
			semi: ["error", "never", {
				beforeStatementContinuationChars: "always"
			}],
			"space-before-blocks": ["error", {
				functions: "never",
				keywords: "never",
				classes: "always"
			}],
			"use-isnan": "error",
			"valid-typeof": "error",

			"@next/next/no-html-link-for-pages": "off",

			"n/no-missing-import": "off",
			"n/no-unpublished-import": "off",
			"n/no-unpublished-require": "off",
			"n/no-unsupported-features/node-builtins": "off",

			"regexp/no-useless-escape": "off",
			"regexp/prefer-d": "off",
			"regexp/use-ignore-case": "off",

			"@stylistic/arrow-parens": ["error", "as-needed"],
			"@stylistic/indent": ["error", "tab", {
				SwitchCase: 1,
				VariableDeclarator: 0
			}],
			"@stylistic/jsx-quotes": ["error", "prefer-double"],
			"@stylistic/key-spacing": ["error"],
			"@stylistic/member-delimiter-style": ["error", {
				multiline: {
					delimiter: "none",
					requireLast: false
				},
				singleline: {
					delimiter: "semi",
					requireLast: false
				}
			}],
			"@stylistic/no-trailing-spaces": "error",
			"@stylistic/padding-line-between-statements": [
				"error",
				{
					blankLine: "always",
					prev: "directive",
					next: "*"
				},
				{
					blankLine: "any",
					prev: [
						"const",
						"let",
						"var"
					],
					next: [
						"const",
						"let",
						"var"
					]
				}
			],
			"@stylistic/quotes": ["error", "double", {
				avoidEscape: true,
				allowTemplateLiterals: "avoidEscape"
			}],
			"@stylistic/quote-props": ["error", "as-needed"],
			"@stylistic/type-annotation-spacing": "error",

			"unused-imports/no-unused-imports": "error",
			"unused-imports/no-unused-vars": ["error", {
				vars: "all",
				varsIgnorePattern: "^_",
				args: "after-used",
				argsIgnorePattern: "^_"
			}]
		}
	})
]

export default eslintConfig
