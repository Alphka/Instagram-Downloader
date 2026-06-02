/** @param {string} url */
export default function GetURLFilename(url){
	const last = !url.endsWith("/")
	return /** @type {string} */ (new URL(url).pathname.split("/").at(last ? -1 : -2))
}
