// eslint-disable-next-line no-control-regex
const illegalCharPattern = /[/\\:*?"<>|\u0000-\u001F]/g

const reservedWindowsNames = new Set([
	"CON",
	"PRN",
	"AUX",
	"NUL",
	"COM1",
	"COM2",
	"COM3",
	"COM4",
	"COM5",
	"COM6",
	"COM7",
	"COM8",
	"COM9",
	"LPT1",
	"LPT2",
	"LPT3",
	"LPT4",
	"LPT5",
	"LPT6",
	"LPT7",
	"LPT8",
	"LPT9"
])

/** @param {string} name */
export default function SanitizeFilename(name){
	let sanitized = name.replace(illegalCharPattern, "_").replace(/^[.\s]+|[.\s]+$/g, "")

	const stem = sanitized.split(".")[0].toUpperCase()

	if(reservedWindowsNames.has(stem)){
		sanitized = "_" + sanitized
	}

	return sanitized
}
