/**
 * @param {{ video_versions?: import("../typings/api.js").VideoVersion[] | null, image_versions2: { candidates: import("../typings/api.js").ImageVersion[] } }} item
 * @returns {import("../typings/api.js").ImageVersion[] | import("../typings/api.js").VideoVersion[]}
 */
export default function GetCorrectContent(item){
	return "video_versions" in item && item.video_versions ? item.video_versions : item.image_versions2.candidates
}
