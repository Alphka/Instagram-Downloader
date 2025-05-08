/** @param {string} username */
export default function ValidateUsername(username){
	const throwError = () => {
		throw `Invalid username: ${username}`
	}

	const { length } = username

	if(!length || !username.trim().length || length > 64) throwError()
	if(Array.from(username).every(letter => letter === "_")) throwError()
	if(!/^\w(?:(?:\w|\.(?!\.)){0,28}\w)?$/.test(username)) throwError()
}
