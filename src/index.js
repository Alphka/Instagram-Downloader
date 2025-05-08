#!/usr/bin/env node --no-warnings

import { dirname, isAbsolute, join, relative, resolve } from "path"
import { existsSync, mkdirSync, readFileSync } from "fs"
import { fileURLToPath } from "url"
import { program } from "commander"
import Downloader from "./Downloader.js"
import isNumber from "./helpers/isNumber.js"
import config from "./config.js"
import Log from "./helpers/Log.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const root = join(__dirname, "..")
const cwd = process.cwd()

const packageInfo = /** @type {import("../package.json")} */ (JSON.parse(readFileSync(join(root, "package.json"), "utf8")))

/**
 * @param {string | undefined} directory
 * @param {boolean} force
 */
function GetOutputDirectory(directory, force){
	if(!directory) return GetOutputDirectory(cwd, force)

	const path = resolve(cwd, directory)
	const relativePath = relative(root, path)

	// If doesn't start with ".." and isn't on another disk
	const isSubdir = !relativePath.startsWith("..") && !isAbsolute(relativePath)

	if(path === root || isSubdir){
		const path = join(root, "output")
		if(!existsSync(path)) mkdirSync(path)
		return path
	}

	if(!existsSync(path)){
		if(!force) throw "Output folder doesn't exist. Use the --force flag to ignore this message"
		mkdirSync(path, { recursive: true })
	}

	return path
}

const command = program
	.name(packageInfo.bin && Object.keys(packageInfo.bin)[0] || packageInfo.name)
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

config.options.forEach(({ option, alternative, description, defaultValue, syntax }) => {
	let flags = ""

	if(alternative){
		if(Array.isArray(alternative)) flags += alternative.map(command => "-" + command).join(", ")
		else flags += "-" + alternative

		if(option) flags += ", "
	}

	if(option) flags += "--" + option
	if(syntax) flags += " " + syntax

	// @ts-ignore
	command.option(flags, description, defaultValue)
})

command.parse()
