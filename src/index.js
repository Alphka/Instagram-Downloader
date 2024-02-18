#!/usr/bin/env node --no-warnings

import { dirname, isAbsolute, join, relative, resolve } from "path"
import { existsSync, mkdirSync } from "fs"
import { fileURLToPath } from "url"
import { program } from "commander"
import packageConfig from "../package.json" assert { type: "json" }
import Downloader from "./Downloader.js"
import isNumber from "./helpers/isNumber.js"
import config from "./config.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const cwd = process.cwd()
const root = join(__dirname, "..")

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
	.name(packageConfig.bin && Object.keys(packageConfig.bin)[0] || packageConfig.name)
	.version(packageConfig.version, "-v, --version", "Display program version")
	.description(packageConfig.description)
	.argument(config.argument.name, config.argument.description)
	.helpOption("-h, --help", "Display help")
	.action(
		/**
		 * @param {string} _arg
		 * @param {import("./typings/index.js").Options} options
		 * @param {import("commander").Command} command
		 */
		(_arg, options, command) => {
		if(!command.args.length) throw "No usernames provided"
		if(!options.highlights) options.hcover = false

		const output = GetOutputDirectory(options.output, options.force)

		new Downloader(command.args, isNumber(options.queue) ? Number(options.queue) : 12, isNumber(options.limit) ? Number(options.limit) : undefined).Init({
			output,
			...options
		})
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
