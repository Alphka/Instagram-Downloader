/**
 * @param {string} searchString
 * @param {RegExp[]} regexArray
 */
export default function FindRegexArray(searchString, regexArray){
	/** @type {string | undefined} */
	let id

	for(const regex of regexArray){
		const match = searchString.match(regex)?.[1]

		if(match){
			id = match
			break
		}
	}

	return id
}
