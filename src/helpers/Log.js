import chalk from "chalk"

const isTesting = process.env.npm_command === "test" || process.env.npm_lifecycle_event === "test"

export default function Log(...args){
	if(isTesting) return

	const date = new Date().toLocaleString("pt-BR").split(", ")[1]

	if(args.length === 1){
		const arg = args[0]

		if(arg instanceof Error){
			const message = arg.cause ? `${arg.message} (${arg.cause})` : arg.message
			return console.error(chalk.redBright(`[${date}] ${message}`))
		}

		if(typeof arg === "string") return console.log(`${chalk.blackBright(`[${date}]`)} ${arg}`)
	}

	console.log(chalk.blackBright(`[${date}]`), ...args)
}
