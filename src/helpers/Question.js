import { createInterface } from "readline"

/**
 * @param {string} question
 * @returns {Promise<string>}
 */
export default function Question(question){
	const readline = createInterface({
		input: process.stdin,
		output: process.stdout
	})

	return new Promise(resolve => {
		readline.question(question, answer => {
			readline.close()
			resolve(answer)
		})
	})
}
