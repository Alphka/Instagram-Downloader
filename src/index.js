#!/usr/bin/env node

import { program } from "commander"
import GetOutputDirectory from "./helpers/GetOutputDirectory.js"
import packageInfo from "../package.json" with { type: "json" }
import Downloader from "./Downloader.js"
import isNumber from "./helpers/isNumber.js"
import config from "./config.js"
import Log from "./helpers/Log.js"

const command = program
	.name(Object.keys(packageInfo.bin)[0] || packageInfo.name)
	.version(packageInfo.version, "-v, --version", "Display program version")
	.description(packageInfo.description)
	.argument(config.argument.name, config.argument.description)
	.helpOption("-h, --help", "Display help")
	.action(
		/**
		 * @param {string} _arg
		 * @param {import("./typings/index.js").Options} options
		 * @param {import("commander").Command} command
		 */
		async (_arg, options, command) => {
			try{
				if(!command.args.length) throw "No usernames provided"
				if(!options.highlights) options.hcover = false

				if(
					!options.highlights &&
					!options.timeline &&
					!options.stories
				) throw "Allow download of at least one type of content"

				const output = GetOutputDirectory(options.output, options.force)

				const downloader = new Downloader(
					command.args,
					isNumber(options.queue) ? Number(options.queue) : 12,
					isNumber(options.limit) ? Number(options.limit) : undefined
				)

				await downloader.Init({
					...options,
					output
				})
			}catch(error){
				Log(error instanceof Error ? error : new Error(String(error)))
				process.exitCode = 1
			}
		})

for(const { option, alternative, description, defaultValue, syntax } of config.options){
	let flags = ""

	if(alternative){
		flags += Array.isArray(alternative)
			? alternative.map((command) => "-" + command).join(", ")
			: `-${alternative}`

		if(option) flags += ", "
	}

	if(option) flags += "--" + option
	if(syntax) flags += " " + syntax

	// @ts-ignore
	command.option(flags, description, defaultValue)
}

command.parse()
