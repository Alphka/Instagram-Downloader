/* eslint-disable no-console */

import chalk from "chalk"

/** @param {any[]} args */
export default function Debug(...args){
	console.log(chalk.redBright("[DEBUG]"), ...args)
}
