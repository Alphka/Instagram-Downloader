import { fileURLToPath } from "url"
import { FlatCompat } from "@eslint/eslintrc"
import { dirname } from "path"
import typescriptPlugin from "@typescript-eslint/eslint-plugin"
import unusedImports from "eslint-plugin-unused-imports"
import stylistic from "@stylistic/eslint-plugin"
import globals from "globals"
import sonar from "eslint-plugin-sonarjs"

const compat = new FlatCompat({
	baseDirectory: import.meta.dirname ?? dirname(fileURLToPath(import.meta.url))
})

const eslintConfig = [
	{
		plugins: {
			sonar,
			"@stylistic": stylistic,
			"unused-imports": unusedImports,
			"@typescript-eslint": typescriptPlugin
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
		extends: [
			"plugin:n/recommended-script",
			"plugin:regexp/recommended",
			"plugin:@typescript-eslint/recommended"
		],
		ignorePatterns: [
			"node_modules",
			".vscode",
			"output",
			"tests/*/**",
			"test*.js",
			"test*.ts"
		],
		rules: {
			"array-bracket-spacing": "off",
			"array-callback-return": "error",
			"arrow-spacing": "off",
			"comma-dangle": "off",
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
			"keyword-spacing": "off",
			"linebreak-style": ["warn", "unix"],
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
			"no-redeclare": "off",
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
			"object-curly-spacing": "off",
			"object-shorthand": "error",
			"one-var": ["error", "never"],
			"operator-assignment": "error",
			"prefer-arrow-callback": "off",
			"prefer-object-spread": "error",
			"prefer-regex-literals": "error",
			"prefer-rest-params": "error",
			"prefer-spread": "error",
			"prefer-template": "off",
			quotes: "off",
			"require-yield": "error",
			semi: "off",
			"space-before-blocks": "off",
			"use-isnan": "error",
			"valid-typeof": "error",
			"space-infix-ops": "off",

			"n/no-missing-import": "off",
			"n/no-unpublished-import": "off",
			"n/no-unpublished-require": "off",
			"n/no-unsupported-features/node-builtins": "off",

			"regexp/no-useless-escape": "off",
			"regexp/prefer-d": "off",
			"regexp/use-ignore-case": "off",

			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/interface-name-prefix": "off",
			"@typescript-eslint/explicit-function-return-type": "off",
			"@typescript-eslint/explicit-module-boundary-types": "off",
			"@typescript-eslint/ban-ts-comment": "off",
			"@typescript-eslint/no-empty-object-type": "off",
			"@typescript-eslint/no-unused-vars": "off",
			"@typescript-eslint/no-unused-expressions": "off",
			"@typescript-eslint/no-duplicate-enum-values": "off",
			"@typescript-eslint/no-unnecessary-type-constraint": "off",
			"@typescript-eslint/consistent-type-imports": ["error", {
				disallowTypeAnnotations: false
			}],

			"@stylistic/array-bracket-spacing": ["error", "never"],
			"@stylistic/arrow-parens": ["error", "as-needed"],
			"@stylistic/arrow-spacing": ["error", {
				before: true,
				after: true
			}],
			"@stylistic/comma-spacing": ["error", {
				before: false,
				after: true
			}],
			"@stylistic/block-spacing": ["error", "always"],
			"@stylistic/brace-style": ["error", "1tbs", {
				allowSingleLine: true
			}],
			"@stylistic/comma-dangle": ["error", "never"],
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
			"@stylistic/no-trailing-spaces": "error",
			"@stylistic/no-whitespace-before-property": "error",
			"@stylistic/object-curly-newline": ["error", {
				consistent: true
			}],
			"@stylistic/object-curly-spacing": ["error", "always"],
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
			"@stylistic/switch-colon-spacing": ["error", {
				after: true,
				before: false
			}],
			"@stylistic/template-curly-spacing": ["error", "never"],
			"@stylistic/template-tag-spacing": ["error", "never"],
			"@stylistic/type-annotation-spacing": "error",
			"@stylistic/type-generic-spacing": ["error"],
			"@stylistic/type-named-tuple-spacing": ["error"],
			"@stylistic/yield-star-spacing": ["error", "after"],

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
