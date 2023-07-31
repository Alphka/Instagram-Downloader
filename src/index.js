#!/usr/bin/env node

import { dirname, isAbsolute, join, relative, resolve } from "path"
import { existsSync, mkdirSync } from "fs"
import { fileURLToPath } from "url"
import { parseArgs } from "util"
import Downloader from "./Downloader.js"
import isNumber from "./helpers/isNumber.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const cwd = process.cwd()
const args = process.argv.slice(2)
const root = join(__dirname, "..")

const { values, positionals } = parseArgs({
	args,
	options: {
		output: {
			type: "string",
			short: "o",
			default: cwd
		},
		force: {
			type: "boolean",
			short: "f"
		},
		limit: {
			type: "string",
			short: "l",
			default: "15"
		},
		"no-timeline": {
			type: "boolean"
		},
		"no-highlights": {
			type: "boolean"
		},
		"no-cover": {
			type: "boolean"
		},
		"no-stories": {
			type: "boolean"
		}
	},
	allowPositionals: true
})

// TODO: Throw error when no-highlights, no-timeline and no-stories are true

try{
	const {
		force,
		"no-stories": noStories,
		"no-timeline": noTimeline,
		"no-highlights": noHighlights,
		"no-cover": noCover,
		output: _output,
		limit: _limit
	} = values

	const usernames = positionals.map(name => name.trim()).filter(name => name.length)

	if(!positionals.length) throw new SyntaxError("No username provided")
	if(!usernames.length) throw new SyntaxError("Invalid username")
	if(!isNumber(_limit)) throw new TypeError("Invalid limit")

	const limit = Number(_limit)
	const output = (() => {
		const path = resolve(cwd, _output)
		const relativePath = relative(root, path)
		const isSubdir = !relativePath.startsWith("..") && !isAbsolute(relativePath)

		if(path === root || isSubdir){
			const path = join(root, "output")
			mkdirSync(path, { recursive: true })
			return path
		}

		if(!existsSync(path)){
			if(!force) throw "Output folder doesn't exist. Use the --force flag to ignore this message"
			mkdirSync(path, { recursive: true })
		}

		return path
	})()

	const index = new Downloader(usernames, limit)

	index.Init({
		output,
		stories: !noStories,
		timeline: !noTimeline,
		highlights: !noHighlights,
		cover: !noCover
	})
}catch(error){
	console.error(error)
}
