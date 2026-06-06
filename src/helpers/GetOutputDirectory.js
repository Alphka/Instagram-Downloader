import { isAbsolute, join, relative, resolve } from "node:path"
import { existsSync, mkdirSync } from "node:fs"

const root = join(import.meta.dirname, "../..")
const cwd = process.cwd()

/**
 * @param {string | undefined} directory
 * @param {boolean} force
 */
export default function GetOutputDirectory(directory, force){
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
