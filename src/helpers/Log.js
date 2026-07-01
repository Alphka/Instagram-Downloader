/* eslint-disable no-console */

import chalk from "chalk"

const isTesting = process.env.npm_command === "test" || process.env.npm_lifecycle_event === "test"

/** @param {any[]} args */
export default function Log(...args){
	if(isTesting) return

	const date = new Date().toLocaleTimeString(undefined, {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false
	})

	if(args.length === 1){
		const arg = args[0]

		if(arg instanceof Error){
			const message = arg.cause
				? `${arg.message} (${typeof arg.cause === "string" ? arg.cause : /** @type {Error} */ (arg.cause).message})`
				: arg.message

			return console.error(chalk.redBright(`[${date}] ${message}`))
		}

		if(typeof arg === "string") return console.log(`${chalk.blackBright(`[${date}]`)} ${arg}`)
	}

	console.log(chalk.blackBright(`[${date}]`), ...args)
}
