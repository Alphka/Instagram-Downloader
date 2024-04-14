/** @param {string} username */
export default function ValidateUsername(username){
	if(!/^(\w(?:(?:\w|(?:\.(?!\.))){0,28}(?:\w))?)$/.test(username)){
		throw `Invalid username: ${username}`
	}
}
