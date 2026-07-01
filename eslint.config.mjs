import { defineConfig } from "eslint/config"
import unusedImports from "eslint-plugin-unused-imports"
import regexPlugin from "eslint-plugin-regexp"
import nodePlugin from "eslint-plugin-n"
import stylistic from "@stylistic/eslint-plugin"
import tseslint from "typescript-eslint"
import unicorn from "eslint-plugin-unicorn"
import globals from "globals"
import sonar from "eslint-plugin-sonarjs"

export default defineConfig([
	{
		ignores: [
			"node_modules",
			".vscode",
			"output",
			"tests/*/**",
			"test*.js",
			"test*.ts"
		]
	},
	{
		name: "tseslint",
		files: ["**/*.{js,cjs,mjs,ts,cts,mts}"],
		extends: tseslint.configs.strictTypeChecked
	},
	{
		name: "node",
		files: ["**/*.{js,cjs,mjs,ts,cts,mts}"],
		...nodePlugin.configs["flat/recommended-module"]
	},
	{
		name: "regexp",
		files: ["**/*.{js,cjs,mjs,ts,cts,mts}"],
		...regexPlugin.configs["flat/recommended"]
	},
	{
		files: ["**/*.{js,cjs,mjs,ts,cts,mts}"],
		plugins: {
			sonar,
			unicorn,
			"@stylistic": stylistic,
			"unused-imports": unusedImports,
			"@typescript-eslint": tseslint.plugin
		},
		languageOptions: {
			ecmaVersion: 2024,
			globals: {
				...globals.node
			},
			parser: tseslint.parser,
			parserOptions: {
				project: true
			},
			sourceType: "module"
		},
		rules: {
			...unicorn.configs.unopinionated.rules,

			"array-bracket-spacing": "off",
			"array-callback-return": "error",
			"arrow-spacing": "off",
			"comma-dangle": "off",
			"constructor-super": "error",
			"default-case": "off",
			"default-case-last": "error",
			"dot-notation": "error",
			"eol-last": "off",
			eqeqeq: ["error", "smart"],
			"for-direction": "error",
			"func-name-matching": "error",
			"func-names": ["error", "as-needed"],
			"getter-return": "error",
			"guard-for-in": "error",
			indent: "off",
			"keyword-spacing": "off",
			"linebreak-style": "off",
			"no-alert": "error",
			"no-async-promise-executor": "error",
			"no-case-declarations": "error",
			"no-class-assign": "error",
			"no-compare-neg-zero": "error",
			"no-cond-assign": "error",
			"no-console": ["error", {
				allow: ["warn", "error"]
			}],
			"no-const-assign": "error",
			"no-constant-binary-expression": "error",
			"no-constant-condition": "error",
			"no-control-regex": "error",
			"no-debugger": "error",
			"no-delete-var": "error",
			"no-dupe-args": "error",
			"no-dupe-class-members": "error",
			"no-dupe-else-if": "error",
			"no-dupe-keys": "error",
			"no-duplicate-case": "error",
			"no-duplicate-imports": ["error", {
				allowSeparateTypeImports: true,
				includeExports: false
			}],
			"no-else-return": ["error", {
				allowElseIf: false
			}],
			"no-empty": "error",
			"no-empty-character-class": "error",
			"no-empty-pattern": "error",
			"no-empty-static-block": "error",
			"no-eval": "warn",
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
			"no-multi-assign": ["error", {
				ignoreNonDeclaration: true
			}],
			"no-multi-str": "error",
			"no-multiple-empty-lines": "off",
			"no-nested-ternary": "off",
			"no-new-native-nonconstructor": "error",
			"no-nonoctal-decimal-escape": "error",
			"no-obj-calls": "error",
			"no-octal": "error",
			"no-param-reassign": "off",
			"no-prototype-builtins": "error",
			"no-redeclare": "off",
			"no-regex-spaces": "error",
			"no-return-assign": "error",
			"no-script-url": "error",
			"no-self-assign": "error",
			"no-self-compare": "error",
			"no-sequences": "error",
			"no-setter-return": "error",
			"no-shadow": "off",
			"no-shadow-restricted-names": "error",
			"no-sparse-arrays": "error",
			"no-template-curly-in-string": "error",
			"no-this-before-super": "error",
			"no-throw-literal": "off",
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
			"no-useless-backreference": "error",
			"no-useless-call": "error",
			"no-useless-catch": "error",
			"no-useless-constructor": "error",
			"no-useless-escape": "error",
			"no-useless-return": "error",
			"no-use-before-define": "off",
			"no-var": "error",
			"no-with": "error",
			"object-curly-spacing": "off",
			"object-shorthand": "error",
			"one-var": ["error", "never"],
			"operator-assignment": "error",
			"prefer-arrow-callback": "off",
			"prefer-const": "error",
			"prefer-exponentiation-operator": "error",
			"prefer-object-has-own": "error",
			"prefer-object-spread": "error",
			"prefer-promise-reject-errors": "error",
			"prefer-regex-literals": "error",
			"prefer-rest-params": "error",
			"prefer-spread": "error",
			"prefer-template": "off",
			quotes: "off",
			radix: "error",
			"require-yield": "error",
			semi: "off",
			"space-before-blocks": "off",
			"space-infix-ops": "off",
			"use-isnan": "error",
			"valid-typeof": "error",
			yoda: "error",

			"n/no-unpublished-import": "off",
			"n/no-unsupported-features/node-builtins": ["error", {
				ignores: [
					"import.meta.dirname",
					"process.loadEnvFile"
				]
			}],

			"regexp/no-useless-escape": "off",
			"regexp/prefer-d": "off",
			"regexp/use-ignore-case": "off",

			"sonar/no-identical-functions": "warn",
			"sonar/no-identical-expressions": "error",
			"sonar/no-redundant-boolean": "warn",
			"sonar/no-redundant-jump": "warn",
			"sonar/no-same-line-conditional": "error",
			"sonar/no-unused-collection": "warn",
			"sonar/no-use-of-empty-return-value": "error",
			"sonar/no-useless-catch": "error",
			"sonar/non-existent-operator": "error",
			"sonar/prefer-immediate-return": "warn",
			"sonar/prefer-object-literal": "warn",
			"sonar/prefer-single-boolean-return": "warn",
			"sonar/prefer-while": "warn",

			"@stylistic/array-bracket-spacing": ["error", "never"],
			"@stylistic/array-element-newline": ["error", "consistent"],
			"@stylistic/arrow-parens": ["error", "always"],
			"@stylistic/arrow-spacing": ["error", {
				before: true,
				after: true
			}],
			"@stylistic/block-spacing": ["error", "always"],
			"@stylistic/brace-style": ["error", "1tbs", {
				allowSingleLine: true
			}],
			"@stylistic/comma-dangle": ["error", "never"],
			"@stylistic/comma-spacing": ["error", {
				before: false,
				after: true
			}],
			"@stylistic/comma-style": ["error", "last"],
			"@stylistic/computed-property-spacing": ["error", "never"],
			"@stylistic/curly-newline": ["error", { consistent: true }],
			"@stylistic/dot-location": ["error", "property"],
			"@stylistic/eol-last": ["error", "always"],
			"@stylistic/function-call-argument-newline": ["error", "consistent"],
			"@stylistic/function-call-spacing": ["error", "never"],
			"@stylistic/generator-star-spacing": ["error", {
				before: false,
				after: true
			}],
			"@stylistic/implicit-arrow-linebreak": ["error", "beside"],
			"@stylistic/indent": ["error", "tab", {
				SwitchCase: 1,
				VariableDeclarator: 0
			}],
			"@stylistic/key-spacing": ["error", {
				beforeColon: false,
				afterColon: true,
				mode: "strict"
			}],
			"@stylistic/keyword-spacing": ["error", {
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
					with: { before: true, after: true },
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
			"@stylistic/linebreak-style": ["error", "unix"],
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
			"@stylistic/no-mixed-spaces-and-tabs": "error",
			"@stylistic/no-multi-spaces": "error",
			"@stylistic/no-multiple-empty-lines": ["error", {
				max: 1,
				maxBOF: 0,
				maxEOF: 1
			}],
			"@stylistic/no-trailing-spaces": "error",
			"@stylistic/no-whitespace-before-property": "error",
			"@stylistic/object-curly-newline": ["error", {
				consistent: true
			}],
			"@stylistic/object-curly-spacing": ["error", "always"],
			"@stylistic/object-property-newline": "off",
			"@stylistic/operator-linebreak": ["error", "after", {
				overrides: {
					"?": "before",
					":": "before",
					"|": "before",
					"&": "before"
				}
			}],
			"@stylistic/padded-blocks": ["error", "never"],
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
			"@stylistic/quote-props": ["error", "as-needed"],
			"@stylistic/quotes": ["error", "double", {
				avoidEscape: true,
				allowTemplateLiterals: "avoidEscape"
			}],
			"@stylistic/rest-spread-spacing": ["error", "never"],
			"@stylistic/semi": ["error", "never", {
				beforeStatementContinuationChars: "always"
			}],
			"@stylistic/semi-spacing": ["error", {
				before: false,
				after: true
			}],
			"@stylistic/semi-style": ["error", "last"],
			"@stylistic/space-before-blocks": ["error", {
				functions: "never",
				keywords: "never",
				classes: "always",
				modules: "always"
			}],
			"@stylistic/space-before-function-paren": ["error", {
				anonymous: "never",
				named: "never",
				asyncArrow: "always",
				catch: "never"
			}],
			"@stylistic/space-in-parens": ["error", "never"],
			"@stylistic/space-infix-ops": "error",
			"@stylistic/space-unary-ops": ["error", {
				words: true,
				nonwords: false
			}],
			"@stylistic/spaced-comment": ["error", "always", {
				block: {
					balanced: true
				}
			}],
			"@stylistic/switch-colon-spacing": ["error", {
				after: true,
				before: false
			}],
			"@stylistic/template-curly-spacing": ["error", "never"],
			"@stylistic/template-tag-spacing": ["error", "never"],
			"@stylistic/type-annotation-spacing": "error",
			"@stylistic/type-generic-spacing": "error",
			"@stylistic/type-named-tuple-spacing": "error",
			"@stylistic/yield-star-spacing": ["error", "after"],

			"@typescript-eslint/ban-ts-comment": "off",
			"@typescript-eslint/comma-dangle": "off",
			"@typescript-eslint/consistent-generic-constructors": "error",
			"@typescript-eslint/consistent-type-imports": ["error", {
				disallowTypeAnnotations: false,
				fixStyle: "separate-type-imports",
				prefer: "type-imports"
			}],
			"@typescript-eslint/explicit-function-return-type": "off",
			"@typescript-eslint/explicit-module-boundary-types": "off",
			"@typescript-eslint/indent": "off",
			"@typescript-eslint/interface-name-prefix": "off",
			"@typescript-eslint/lines-between-class-members": "off",
			"@typescript-eslint/method-signature-style": ["error", "property"],
			"@typescript-eslint/naming-convention": "off",
			"@typescript-eslint/no-confusing-void-expression": "off",
			"@typescript-eslint/no-duplicate-enum-values": "off",
			"@typescript-eslint/no-empty-object-type": "off",
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-extraneous-class": "error",
			"@typescript-eslint/no-floating-promises": "off",
			"@typescript-eslint/no-import-type-side-effects": "error",
			"@typescript-eslint/no-non-null-assertion": "off",
			"@typescript-eslint/no-redeclare": "error",
			"@typescript-eslint/no-unsafe-argument": "off",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unsafe-return": "off",
			"@typescript-eslint/no-unused-expressions": "off",
			"@typescript-eslint/no-unused-vars": ["error", {
				args: "all",
				vars: "all",
				argsIgnorePattern: "^_",
				varsIgnorePattern: "^_",
				caughtErrors: "none",
				caughtErrorsIgnorePattern: "^_",
				destructuredArrayIgnorePattern: "^_",
				ignoreRestSiblings: true
			}],
			"@typescript-eslint/no-use-before-define": ["error", {
				enums: true,
				classes: true,
				typedefs: true,
				functions: false,
				variables: true
			}],
			"@typescript-eslint/only-throw-error": "off",
			"@typescript-eslint/restrict-plus-operands": "off",
			"@typescript-eslint/restrict-template-expressions": "off",
			"@typescript-eslint/unbound-method": "off",
			"@typescript-eslint/use-unknown-in-catch-callback-variable": "off",

			"@typescript-eslint/no-dynamic-delete": "off",
			"@typescript-eslint/no-misused-promises": "off",
			"@typescript-eslint/prefer-promise-reject-errors": "off",

			"unicorn/import-style": ["error", {
				styles: {
					path: {
						default: false
					},
					"node:path": {
						default: false
					}
				}
			}],
			"unicorn/no-array-sort": "off",
			"unicorn/no-top-level-side-effects": "off",
			"unicorn/prefer-string-replace-all": "off",
			"unicorn/prefer-string-slice": "off",

			"unused-imports/no-unused-imports": "error"
		}
	}
])
