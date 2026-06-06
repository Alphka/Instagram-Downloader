/** @param {string} url */
export default function GetURLFilename(url){
	return /** @type {string} */ (new URL(url).pathname.split("/").at(url.endsWith("/") ? -2 : -1))
}
