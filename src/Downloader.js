import { existsSync, readFileSync, writeFileSync, createWriteStream, createReadStream } from "node:fs"
import { mkdir, writeFile, utimes, access, constants } from "node:fs/promises"
import { BASE_URL, API_QUERY, API_REELS } from "./config.js"
import { join, parse } from "node:path"
import { Agent } from "node:https"
import { spawn } from "cross-spawn"
import axios, { AxiosHeaders } from "axios"
import GetCorrectContent from "./helpers/GetCorrectContent.js"
import ValidateUsername from "./helpers/ValidateUsername.js"
import FindRegexArray from "./helpers/FindRegexArray.js"
import GetURLFilename from "./helpers/GetURLFilename.js"
import SplitPNGFrames from "./helpers/SplitPNGFrames.js"
import IsAbsoluteURL from "./helpers/IsAbsoluteURL.js"
import filenamify from "filenamify"
import isNumber from "./helpers/isNumber.js"
import Debug from "./helpers/Debug.js"
import Queue from "./Queue.js"
import sharp from "sharp"
import which from "which"
import mime from "mime"
import Log from "./helpers/Log.js"

/** @type {import("axios").AxiosInstance & { enableRequestLogs?: boolean }} */
const api = axios.create({
	baseURL: BASE_URL,
	httpsAgent: new Agent({
		rejectUnauthorized: false
	}),
	allowAbsoluteUrls: true
})

api.interceptors.request.use((request) => {
	if(api.enableRequestLogs){
		Debug(`Starting request: ${request.url}`)
	}

	const isAbsoluteURL = request.url ? IsAbsoluteURL(request.url) : false

	if(isAbsoluteURL){
		const url = new URL(/** @type {string} */ (request.url))

		if(!request.headers.has("Host")) request.headers.set("Host", url.host)
		if(!request.headers.has("Origin")) request.headers.set("Origin", url.origin)
	}else{
		if(!request.headers.has("Host")) request.headers.set("Host", BASE_URL.replace(/^https?:\/\//, ""))
		if(!request.headers.has("Origin")) request.headers.set("Origin", BASE_URL)
	}

	return request
})

const root = join(import.meta.dirname, "..")
const configPath = join(root, "config.json")

const isTesting = process.env.npm_command === "test" || process.env.npm_lifecycle_event === "test"

api.defaults.headers.common = {
	Accept: "*/*",
	"Accept-Language": "en-US,en;q=0.9",
	Dnt: "1",
	"Sec-Ch-Prefers-Color-Scheme": "dark",
	"Sec-Ch-Ua": '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
	"Sec-Ch-Ua-Full-Version-List": '"Chromium";v="148.0.7778.179", "Google Chrome";v="148.0.7778.179", "Not/A)Brand";v="99.0.0.0"',
	"Sec-Ch-Ua-Mobile": "?0",
	"Sec-Ch-Ua-Model": '""',
	"Sec-Ch-Ua-Platform": '"Windows"',
	"Sec-Ch-Ua-Platform-Version": '"19.0.0"',
	"Sec-Fetch-Dest": "empty",
	"Sec-Fetch-Mode": "cors",
	"Upgrade-Insecure-Requests": "1",
	"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36"
}

api.defaults.headers.get = {
	"Viewport-Width": "1920"
}

const userIdRegexArray = [
	/\{"id":"(\d+)","profile_pic_url"/,
	/\{"query_id":"\d+","user_id":"(\d+)"/,
	/\{"content_type":"PROFILE","target_id":"(\d+)"\}/,
	/"profile_id":"(\d+)"/,
	/profilePage_(\d+)/
]

/** @param {import("fs").PathLike} path */
async function exists(path){
	return new Promise((resolve) => {
		access(path, constants.F_OK)
			.then(() => resolve(true))
			.catch(() => resolve(false))
	})
}

export default class Downloader {
	/** @type {Record<string, string>} */ headers = {}

	/** @type {string} */ output
	/** @type {string[]} */ usernames
	/** @type {number | undefined} */ limit
	/** @type {import("./typings/index.d.ts").Config} */ config
	/** @type {Queue<ReturnType<typeof this.Download>>} */ queue
	/** @type {boolean} */ debug
	/** @type {boolean} */ flatDir
	/** @type {boolean} */ withThumbs

	isEnvSet = false

	/**
	 * @param {string | string[]} usernames
	 * @param {number} queue
	 * @param {number} [limit]
	 */
	constructor(usernames, queue, limit){
		if(Array.isArray(usernames)){
			this.usernames = Array.from(new Set(usernames))

			for(let index = this.usernames.length - 1; index >= 0; index--){
				const username = this.usernames[index]

				try{
					ValidateUsername(username)
				}catch(error){
					Log(new Error(/** @type {string} */ (error)))
					this.usernames.splice(index, 1)
				}
			}
		}else{
			ValidateUsername(usernames)
			this.usernames = [usernames]
		}

		this.limit = limit
		this.queue = new Queue(queue)
		this.flatDir = false
	}
	SetConfig(){
		if(!existsSync(configPath)){
			const { TOKEN, USER_ID, SESSION_ID, COOKIES } = process.env

			/** @type {typeof this.config["cookie"] | undefined} */
			let envCookiesObject

			if(COOKIES){
				try{
					const result = JSON.parse(COOKIES)

					if(!result || typeof result !== "object"){
						throw new TypeError("The configuration value is not an object")
					}

					envCookiesObject = /** @type {Record<string, string>} */ (result)
				}catch(cause){
					Log(new Error("Error parsing COOKIES environment variable", { cause }))
				}
			}

			this.config = {
				cookie: {
					...envCookiesObject,
					csrftoken: /** @type {string} */ (TOKEN),
					ds_user_id: /** @type {string} */ (USER_ID),
					sessionid: /** @type {string} */ (SESSION_ID)
				}
			}

			this.WriteConfig(true)

			return this.config
		}

		let data = readFileSync(configPath, "utf8")

		if(!data.trim()) data = "{}"

		const config = /** @type {import("./typings/index.d.ts").Config} */ (JSON.parse(data))

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if(!config || typeof config !== "object") throw new TypeError("Invalid type from config.json")

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if(!config.cookie) config.cookie = {}

		this.config = config

		this.UpdateHeaders()

		return config
	}
	WriteConfig(sync = false){
		if(isTesting){
			// When not in test environment, the headers will be updated
			// after validating the .env file and the process.env variables.
			this.UpdateHeaders()
			return
		}

		const data = JSON.stringify(this.config, null, "\t") + "\n"

		if(sync){
			writeFileSync(configPath, data, "utf8")
			this.SetEnv(true)
			return
		}

		return Promise.all([
			writeFile(configPath, data, "utf8"),
			this.SetEnv(false)
		])
	}
	SetEnv(sync = false){
		if(isTesting || this.isEnvSet) return

		const { config } = this
		const environmentPath = join(root, ".env")

		if(existsSync(environmentPath)){
			process.loadEnvFile(environmentPath)
		}

		const data = {
			TOKEN: process.env.TOKEN || config.cookie.csrftoken,
			USER_ID: process.env.USER_ID || config.cookie.ds_user_id,
			SESSION_ID: process.env.SESSION_ID || config.cookie.sessionid
		}

		config.cookie.csrftoken = data.TOKEN
		config.cookie.ds_user_id = data.USER_ID
		config.cookie.sessionid = data.SESSION_ID

		this.UpdateHeaders()

		let environmentContent = existsSync(environmentPath) ? readFileSync(environmentPath, "utf8") : ""

		for(const [key, value] of Object.entries(data)){
			if(!value) continue

			const environmentVariablePattern = new RegExp(String.raw`^(\s*${key}\s*=).*$`, "m")

			if(environmentVariablePattern.test(environmentContent)){
				environmentContent = environmentContent.replace(environmentVariablePattern, `$1${value}`)
			}else{
				if(environmentContent !== "" && !environmentContent.endsWith("\n")){
					environmentContent += "\n"
				}

				environmentContent += `${key}=${value}\n`
			}
		}

		this.isEnvSet = true

		if(sync) writeFileSync(environmentPath, environmentContent, "utf8")
		else return writeFile(environmentPath, environmentContent, "utf8")
	}
	UpdateHeaders(){
		const { headers, config } = this

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		const { app_id, cookie } = config || {}

		const token = cookie.csrftoken

		if(token) headers["X-Csrftoken"] = cookie.csrftoken
		if(app_id) headers["X-Ig-App-Id"] = app_id

		headers.Cookie = Object.entries(cookie).map(([key, value]) => `${key}=${value || ""}`).join("; ")
	}
	/**
	 * @param {Pick<import("./typings/index.d.ts").Options,
	 * 	| "highlights"
	 * 	| "withThumbs"
	 * 	| "timeline"
	 * 	| "stories"
	 * 	| "flatDir"
	 * 	| "hcover"
	 * 	| "output"
	 * 	| "debug"
	 * 	| "limit"
	 * > & Required<Pick<import("./typings/index.d.ts").Options, "output">>} data
	 */
	async Init({
		highlights,
		withThumbs,
		timeline,
		stories,
		flatDir,
		hcover,
		output,
		debug,
		limit
	}){
		Log("Initializing")

		this.debug = debug
		this.flatDir = flatDir
		this.withThumbs = withThumbs

		api.enableRequestLogs = debug

		if(isNumber(limit)) this.limit = Number(limit)

		if(!this.usernames.length){
			throw "There are no valid usernames"
		}

		this.SetConfig()

		await this.CheckServerConfig()

		// The function CheckLogin is problematic: Even after setting your credentials,
		// it says the user is not logged in

		/*
		do{
			try{
				// TODO: Change this when anonymous downloads are implemented
				// Only stories and highlights should require authentication

				// await this.CheckLogin()
				// Log("Logged in")

				break
			}catch{
				Log(new Error("You are not logged in. Type your data for authentication."))

				const id = (await Question("User id: ")).trim()
				const token = (await Question("CSRF Token: ")).trim()
				const session = (await Question("Session id: ")).trim()

				if(!token || !id || !session) continue

				this.config.csrftoken = this.config.cookie.csrftoken = token
				this.config.cookie.ds_user_id = id
				this.config.cookie.sessionid = session

				this.WriteConfig(true)
			}
		}while(true) */

		let errored = 0

		for(const username of this.usernames){
			const userId = await this.GetUserId(username)

			if(this.debug) Debug(`User '${username}' has ID: ${userId}`)

			try{
				if(!userId) throw new Error(`Failed to get user ID: ${username}`)

				// TODO: Check if account is private with another endpoint
				// const { is_private, friendship_status: { following } } = await this.GetUser(userId, username)
				// 	// Make the GetUser call non fatal
				// 	.catch((error) => {
				// 		if(this.debug) Debug("GetUser error:", error)
				// 		return { is_private: false, friendship_status: { following: false } }
				// 	})

				// if(is_private && !following){
				// 	throw new Error(`You don't have access to a private account: ${username}`)
				// }
			}catch(error){
				Log(error)
				errored++
				continue
			}

			Log(`Downloading contents from user: ${username}, id: ${userId}`)

			const folder = join(output, username)

			const results = await Promise.allSettled([
				timeline && this.DownloadTimeline(username, folder, this.limit),
				highlights && this.DownloadHighlights(userId, folder, hcover, this.limit, username),
				stories && this.DownloadStories(userId, folder, this.limit, username)
			])

			let resultsErrored = 0

			for(const result of results){
				if(result.status === "rejected"){
					const { reason } = result
					if(reason instanceof Error) reason.stack = `Failed to download user's content: ${username}`
					Log(reason)
					resultsErrored++
				}
			}

			// If no content was downloaded
			if(resultsErrored === results.length) errored++
		}

		// If all downloads failed
		if(errored === this.usernames.length) process.exitCode = 1
	}
	// async CheckLogin(){
	// 	/** @type {import("axios").AxiosResponse<import("./typings/api.js").FacebookAccountAPIResponse>} */
	// 	const response = await this.Request(API_FACEBOOK_ACCOUNT, "POST", {
	// 		headers: {
	// 			Referer: BASE_URL + "/"
	// 		},
	// 		responseType: "json",
	// 		maxRedirects: 0
	// 	})

	// 	if(this.debug) Debug("CheckLogin:", typeof response.data, response.data)

	// 	if(typeof response.data === "object" && "status" in response.data){
	// 		const { status, message } = response.data
	// 		if(status === "ok") return
	// 		if(message) throw new Error(`User is not logged in: ${message}`)
	// 	}

	// 	throw new Error("User is not logged in")
	// }
	// /**
	//  * @param {string} userId
	//  * @param {string} [username]
	//  */
	// async GetUser(userId, username){
	// 	const { fb_dtsg } = this.config

	// 	/** @type {import("axios").AxiosResponse<import("./typings/api.js").QueryUserAPIResponse>} */
	// 	const response = await this.Request(API_GRAPHQL, "POST", {
	// 		data: new URLSearchParams({
	// 			dpr: "1",
	// 			fb_dtsg: /** @type {string} */ (fb_dtsg),
	// 			fb_api_caller_class: "RelayModern",
	// 			fb_api_req_friendly_name: "PolarisProfilePageContentQuery",
	// 			variables: JSON.stringify({
	// 				id: userId,
	// 				render_surface: "PROFILE"
	// 			}),
	// 			server_timestamps: "true",
	// 			doc_id: "26947072594934194"
	// 		}),
	// 		headers: {
	// 			Accept: "*/*",
	// 			Referer: username ? this.GetUserProfileLink(username) : BASE_URL + "/",
	// 			"X-Fb-Friendly-Name": "PolarisProfilePageContentQuery",
	// 			"X-Root-Field-Name": "fetch__XDTUserDict"
	// 		},
	// 		maxRedirects: 0,
	// 		responseType: "json"
	// 	})

	// 	if(typeof response.data === "object"){
	// 		const { data } = response.data

	// 		if(data && "user" in data) return data.user

	// 		throw new Error(`Failed to get user: ${username} (${userId})`)
	// 	}

	// 	throw new Error(`User not found: ${username}`)
	// }
	/** @param {string} username */
	GetUserProfileLink(username){
		return /** @type {const} */ (`${BASE_URL}/${username}/`)
	}
	/** @param {string} username */
	async GetUserId(username){
		const url = this.GetUserProfileLink(username)

		try{
			/** @type {import("axios").AxiosResponse<string>} */
			const { data } = await this.Request(url, "GET", {
				headers: {
					Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
					Cookie: undefined,
					Dpr: "1",
					Priority: "u=0, i",
					"Sec-Fetch-Dest": "document",
					"Sec-Fetch-Mode": "navigate",
					"Sec-Fetch-Site": "none",
					"Sec-Fetch-User": "?1",
					"X-Csrftoken": undefined,
					"X-Ig-App-Id": undefined
				},
				responseType: "text",
				maxRedirects: 0
			})

			return FindRegexArray(data, userIdRegexArray) || null
		}catch(error){
			if(this.debug) Debug(error)
			throw new Error(`Failed to get user ID (${username})`, { cause: error })
		}
	}
	/**
	 * @param {string} username
	 * @param {string} [after]
	 * @param {number} [count]
	 */
	async GetTimeline(username, after, count = 12){
		/** @type {import("axios").AxiosResponse<import("./typings/api.js").QueryTimelineAPIResponse>} */
		const response = await this.Request(API_QUERY, "POST", {
			data: new URLSearchParams({
				variables: JSON.stringify({
					data: {
						count,
						include_reel_media_seen_timestamp: true,
						include_relationship_info: true,
						latest_besties_reel_media: true,
						latest_reel_media: true
					},
					username,
					...(after ? {
						after,
						before: null,
						first: count,
						last: null
					} : undefined),
					__relay_internal__pv__PolarisIsLoggedInrelayprovider: true,
					__relay_internal__pv__PolarisShareSheetV3relayprovider: true
				}),
				server_timestamps: "true",
				fb_api_caller_class: "RelayModern",
				fb_api_req_friendly_name: "PolarisProfilePostsQuery",
				doc_id: "24388485070759223"
			}),
			headers: {
				Accept: "*/*",
				Priority: "u=1, i",
				Referer: this.GetUserProfileLink(username),
				"Content-Type": "application/x-www-form-urlencoded",
				"X-Fb-Friendly-Name": "PolarisProfilePostsQuery",
				"X-Root-Field-Name": "xdt_api__v1__feed__user_timeline_graphql_connection"
			},
			responseType: "json"
		})

		return response.data.data.xdt_api__v1__feed__user_timeline_graphql_connection
	}
	/**
	 * @param {string} user_id
	 * @param {string} [username]
	 */
	async GetHighlights(user_id, username){
		const { config } = this
		const { fb_dtsg } = config

		/** @type {import("axios").AxiosResponse<import("./typings/api.js").QueryHighlightsAPIResponse>} */
		const response = await this.Request(API_QUERY, "POST", {
			data: new URLSearchParams({
				dpr: "1",
				fb_dtsg: /** @type {string} */ (fb_dtsg),
				fb_api_caller_class: "RelayModern",
				fb_api_req_friendly_name: "PolarisProfileStoryHighlightsTrayContentQuery",
				variables: JSON.stringify({ user_id }),
				server_timestamps: "true",
				doc_id: "36997000523232338"
			}),
			headers: {
				Accept: "*/*",
				Priority: "u=1, i",
				Referer: username ? this.GetUserProfileLink(username) : BASE_URL + "/",
				"Content-Type": "application/x-www-form-urlencoded",
				"Sec-Fetch-Dest": "empty",
				"Sec-Fetch-Mode": "cors",
				"Sec-Fetch-Site": "same-origin",
				"X-Fb-Friendly-Name": "PolarisProfileStoryHighlightsTrayContentQuery"
			},
			responseType: "json"
		})

		try{
			const { cookie: { sessionid } } = config

			if(!sessionid || sessionid === '""'){
				throw "GetHighlights: Unauthenticated or login session expired"
			}

			const { data: { highlights } } = response.data

			return highlights.edges.map(({ node }) => node)
		}catch(error){
			if(typeof error === "string") throw new Error(error)

			throw new Error(`Failed to get user (${username || user_id}) highlights`, {
				cause: /** @type {Error} */ (error).message.replace(/\[?Error\]?:? ?/, "")
			})
		}
	}
	/**
	 * @param {import("./typings/api.js").HighlightId[]} reelsIds
	 * @param {string} [username]
	 */
	async GetHighlightsContents(reelsIds, username){
		/**
		 * @type {import("axios").AxiosResponse<
		 * 	| import("./typings/api.js").HighlightsAPIResponse
		 * 	| import("./typings/api.js").GraphAPIResponseError
		 * >
		 * } */
		const response = await this.Request(API_QUERY, "POST", {
			data: new URLSearchParams({
				variables: JSON.stringify({
					after: null,
					before: null,
					first: reelsIds.length,
					initial_reel_id: reelsIds[0],
					reel_ids: reelsIds,
					last: null
				}),
				doc_id: "25536143079310158"
			}),
			headers: {
				Referer: username ? this.GetUserProfileLink(username) : BASE_URL + "/"
			},
			responseType: "json"
		})

		const { xdt_api__v1__feed__reels_media__connection: feed } = response.data.data || {}

		if(!feed){
			const { errors } = /** @type {import("./typings/api.js").GraphAPIResponseError} */ (response.data)

			throw new Error(`Error downloading highlights (${errors[0].severity})`)
		}

		if(this.debug) Debug("GetHighlightsContents:", JSON.stringify(feed, undefined, 2))

		return feed.edges.map(({ node }) => node)
	}
	/**
	 * @param {`${number}`} userId
	 * @param {string} [username]
	 */
	async GetStories(userId, username){
		/** @type {import("axios").AxiosResponse<import("./typings/api.js").StoriesAPIResponse>} */
		const response = await this.Request(API_REELS, "GET", {
			params: {
				reel_ids: userId
			},
			headers: {
				Referer: username ? this.GetUserProfileLink(username) : BASE_URL + "/",
				"Sec-Fetch-Site": "same-origin",
				"Sec-Fetch-Dest": "empty",
				"Sec-Fetch-Mode": "cors"
			},
			responseType: "json"
		})

		if(typeof response.data === "object"){
			const { reels, reels_media } = response.data

			if(this.debug) Debug("GetStories:", JSON.stringify(response.data, undefined, 2))

			return reels_media?.length ? reels[userId] : null
		}

		return null
	}
	/**
	 * @param {string} user_id
	 * @param {string} folder
	 * @param {boolean} [hcover]
	 * @param {number} [limit]
	 * @param {string} [username]
	 */
	async DownloadHighlights(user_id, folder, hcover, limit = Infinity, username){
		const highlights = await this.GetHighlights(user_id, username)

		const highlightsMap = new Map(highlights.map((reel) => [reel.id, reel]))

		let hasHighlights = Boolean(highlights.length)
		let count = 0

		while(highlights.length && limit > count){
			const ids = highlights.splice(0, 10).map(({ id }) => id)
			const highlightsContents = await this.GetHighlightsContents(ids, username)

			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			if(!highlightsContents) throw new Error("No highlights found. The request might have been forbidden")

			if(!highlightsContents.length){
				hasHighlights = false
				break
			}

			for(const { id, items, title } of highlightsContents){
				if(count > limit) throw new Error("Unexpected error")

				Log(`Downloading highlight: '${title}' (${id.substring(id.indexOf(":") + 1)})`)

				const targetDir = this.flatDir ? folder : join(folder, "highlights", filenamify(title))

				if(items.length){
					await mkdir(targetDir, { recursive: true })
				}

				const shouldDownloadCover = hcover && highlightsMap.has(id)
				let coverUrl

				if(shouldDownloadCover){
					const { cropped_image_version: { url } } = /** @type {typeof highlights[number]} */ (highlightsMap.get(id)).cover_media
					coverUrl = url
				}

				const data = { count, limit }
				const { urls, limited } = await this.DownloadItems(items, targetDir, data, username)

				count = data.count

				// Might not download cover if limit is set
				if(shouldDownloadCover && coverUrl && !urls.has(coverUrl) && !(count === limit || limited)){
					const coverFilename = GetURLFilename(coverUrl)
					const filenames = Array.from(urls).map(GetURLFilename)

					if(!filenames.includes(coverFilename)){
						count++

						try{
							await this.Download(coverUrl, targetDir, new Date)
						}catch(error){
							Log(error)
						}
					}
				}

				if(limited) break
			}
		}

		if(hasHighlights){
			if(count === 0) Log("No content found in the highlights")
		}else Log("No highlights found")
	}
	/**
	 * @param {string} userId
	 * @param {string} folder
	 * @param {number} [limit]
	 * @param {string} [username]
	 */
	async DownloadStories(userId, folder, limit = Infinity, username){
		const results = await this.GetStories(/** @type {`${number}`} */ (userId), username)

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if(!results?.items?.length) return Log("No stories found")

		const { items: stories } = results

		Log("Downloading stories")

		const targetDir = this.flatDir ? folder : join(folder, "stories")

		await mkdir(targetDir, { recursive: true })

		let count = 0

		while(stories.length && limit > count){
			const items = stories.splice(0, 10)
			const data = { count, limit }

			const { limited } = await this.DownloadItems(items, targetDir, data, username)

			count = data.count

			if(limited) break
		}
	}
	/**
	 * @param {string} username
	 * @param {string} folder
	 * @param {number} [limit]
	 */
	async DownloadTimeline(username, folder, limit = Infinity){
		/** @type {string | undefined} */
		let lastId
		let first = true
		let count = 0
		let hasMore = true

		while(hasMore && limit > count){
			const { edges, page_info } = await this.GetTimeline(username, lastId, this.queue.limit)

			if(first){
				first = false

				if(edges.length) Log("Downloading timeline")
				else break
			}

			const targetDir = this.flatDir ? folder : join(folder, "timeline")

			await mkdir(targetDir, { recursive: true })

			const data = { count, limit }
			const { limited } = await this.DownloadItems(edges.map(({ node }) => node), targetDir, data, username)

			count = data.count

			if(limited) break

			hasMore = page_info.has_next_page
			lastId = page_info.end_cursor
		}

		if(count === 0) Log("No content found in timeline")
	}
	/**
	 * @param {(import("./typings/api.js").FeedItem | import("./typings/api.js").GraphTimelineMedia | import("./typings/api.js").GraphHighlightsMedia | import("./typings/api.js").GraphReelsMedia)[]} items
	 * @param {string} folder
	 * @param {{ count: number, limit: number }} [data]
	 * @param {string} [_username]
	 */
	async DownloadItems(items, folder, data, _username){
		const { withThumbs } = this

		/** @type {Map<string, Date>} */
		const urls = new Map

		/** @type {Map<string, string>} */
		const folders = new Map

		const shouldLimit = data && typeof data.limit === "number"

		/** @type {boolean} */
		let limited = false

		if(shouldLimit && !data.limit) return {
			urls: /** @type {Set<string>} */ (new Set),
			limited: true
		}

		/** @type {string | null | undefined} */
		let ffmpegPath

		/**
		 * @param {Pick<typeof items[number], "video_versions" | "image_versions2">} item
		 * @param {Date} date
		 * @param {string} folder
		 */
		const QueueItemContentDownload = async (item, date, folder) => {
			if(ffmpegPath === undefined){
				ffmpegPath = await which("ffmpeg", { nothrow: true })
			}

			const shouldDownloadStaticVideo = !!ffmpegPath && withThumbs && "video_versions" in item && item.video_versions && item.image_versions2.candidates[0].width === 640

			if(shouldDownloadStaticVideo){
				try{
					const imagePath = join(folder, `${parse(GetURLFilename(item.image_versions2.candidates[0].url)).name}_static.jpg`)

					if(!(await exists(imagePath))){
						const videoURL = /** @type {import("./typings/api.js").VideoVersion[]} */ (item.video_versions)[0].url
						const videoFilename = GetURLFilename(videoURL)
						const videoPath = join(folder, videoFilename)

						// Avoid multiple requests to download video
						if(!(await exists(videoPath))){
							const file = createWriteStream(videoPath)

							/** @type {import("axios").AxiosResponse<import("stream").PassThrough>} */
							const { data } = await this.Request(videoURL, "GET", {
								headers: {
									Accept: "*/*",
									Priority: "u=1, i",
									Cookie: undefined,
									Pragma: "no-cache",
									Referer: BASE_URL + "/",
									"Cache-Control": "no-cache",
									"Sec-Fetch-Dest": "empty",
									"Sec-Fetch-Mode": "cors",
									"Sec-Fetch-Site": "cross-site",
									"X-Csrftoken": undefined,
									"X-Ig-App-Id": undefined
								},
								responseType: "stream"
							})

							await new Promise((resolve, reject) => {
								file.on("close", async () => {
									try{
										await utimes(videoPath, date, date)
										resolve(videoPath)
									}catch(error){
										reject(error)
									}
								})

								file.on("error", reject)

								data.pipe(file)
							})
						}

						/* eslint-disable @stylistic/array-element-newline */
						const ffmpegSimilarFramesProcess = spawn(/** @type {string} */ (ffmpegPath), [
							"-i", "pipe:3",
							"-vf", "mpdecimate",
							"-f", "null",
							"-"
						], {
							windowsHide: true,
							stdio: [
								"ignore", "pipe", "pipe",
								"pipe"
							]
						})
						/* eslint-enable @stylistic/array-element-newline */

						/** @type {Buffer[]} */
						const similarFramesChunks = [];

						/** @type {import("stream").Readable} */ (ffmpegSimilarFramesProcess.stderr).on("data", (chunk) => similarFramesChunks.push(chunk))

						createReadStream(videoPath).pipe(/** @type {NodeJS.WritableStream} */ (ffmpegSimilarFramesProcess.stdio[3]))

						ffmpegSimilarFramesProcess.on("close", (code) => {
							if(code !== 0) return

							const result = Buffer.concat(similarFramesChunks).toString().trim()
							const similarFramesSize = Number(/** @type {RegExpMatchArray} */ (result.match(/frame=\s*(\d+)/))[1])

							// Static video
							/* eslint-disable @stylistic/array-element-newline */
							if(similarFramesSize !== 0 && similarFramesSize < 300){
								const ffmpegProcess = spawn(/** @type {string} */ (ffmpegPath), [
									"-hide_banner",
									"-loglevel", "error",
									"-i", "pipe:3",
									"-vf", "fps=1",
									"-vcodec", "png",
									"-f", "image2pipe",
									"pipe:4"
								], {
									windowsHide: true,
									stdio: [
										"ignore", "pipe", "pipe",
										"pipe", "pipe"
									]
								})
								/* eslint-enable @stylistic/array-element-newline */

								/** @type {Buffer[]} */
								const framesChunks = [];

								/** @type {import("stream").Readable} */ (ffmpegProcess.stdio[4]).on("data", (chunk) => framesChunks.push(chunk))

								createReadStream(videoPath).pipe(/** @type {NodeJS.WritableStream} */ (ffmpegProcess.stdio[3]))

								ffmpegProcess.on("close", async (code) => {
									if(code !== 0) return

									const framesBuffer = Buffer.concat(framesChunks)
									const frames = SplitPNGFrames(framesBuffer)
										.sort((a, b) => b.byteLength - a.byteLength)

									if(frames.length){
										const image = await sharp(frames[0])
											.jpeg({
												force: true,
												quality: 90,
												progressive: true,
												chromaSubsampling: "4:4:4"
											})
											.toBuffer()

										await writeFile(imagePath, image)
										utimes(imagePath, date, date)
									}
								})
							}
						})
					}
				}catch(error){
					Log(new Error("Failed to extract static video frame", { cause: error }))
				}
			}

			for(const url of [
				GetCorrectContent(item)[0].url,
				withThumbs && !shouldDownloadStaticVideo && item.video_versions?.[0] && item.image_versions2.candidates[0].url
			].filter(Boolean)){
				urls.set(url, date)
				folders.set(url, folder)

				if(data) data.count++
			}
		}

		/**
		 * @param {NonNullable<import("./typings/api.js").FeedItem["carousel_media"]>} carousel_media
		 * @param {Date} date
		 * @param {string} folder
		 */
		async function QueueCarouselDownload(carousel_media, date, folder){
			for(const media of carousel_media){
				if(shouldLimit && data.count >= data.limit){
					limited = true
					break
				}

				await QueueItemContentDownload(media, date, folder)
			}
		}

		for(const item of items){
			if(shouldLimit && data.count >= data.limit){
				limited = true
				break
			}

			const date = new Date(item.taken_at * 1000)

			if(item.carousel_media_count){
				const target_dir = this.flatDir ? folder : join(folder, "carousel", item.pk)

				const carousel_media = /** @type {NonNullable<typeof item.carousel_media>} */ (item.carousel_media)

				if(carousel_media.length){
					await mkdir(target_dir, { recursive: true })
				}

				await QueueCarouselDownload(carousel_media, date, target_dir)

				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				if(limited) break

				continue
			}

			await QueueItemContentDownload(item, date, folder)
		}

		await Promise.all(Array.from(urls.entries()).map(async ([url, date]) => {
			try{
				const filename = GetURLFilename(url)

				await this.Download(url, folders.get(url) || folder, date, filename, {
					headers: {
						...(filename.endsWith(".mp4") ? {
							Accept: "*/*",
							Priority: "u=1, i",
							"Sec-Fetch-Dest": "empty"
						} : {
							Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
							Priority: "i",
							"Sec-Fetch-Dest": "image"
						}),
						Dnt: "1",
						Cookie: undefined,
						Pragma: "no-cache",
						Referer: BASE_URL + "/",
						"Cache-Control": "no-cache",
						"Sec-Fetch-Mode": "cors",
						"Sec-Fetch-Site": "cross-site",
						"X-Csrftoken": undefined,
						"X-Ig-App-Id": undefined
					}
				})
			}catch(error){
				Log(error instanceof Error ? error : new Error(String(error)))
				urls.delete(url)
			}
		}))

		return {
			urls: new Set(urls.keys()),
			limited
		}
	}
	/**
	 * @param {string} url
	 * @param {string} folder
	 * @param {Date | number} [date]
	 * @param {string} [filename]
	 * @param {import("axios").AxiosRequestConfig} [config]
	 * @returns {Promise<string | undefined>}
	 */
	async Download(url, folder, date = new Date, filename = "", config = {}){
		if(!filename) filename = GetURLFilename(url)

		const { name, ext } = parse(filename)

		const path = join(folder, filename)

		// Skip re-download of already downloaded content
		if(await exists(path) || (ext === ".webp" && await exists(join(folder, `${path}.jpg`)))){
			return path
		}

		const mimeType = mime.getType(ext)

		if(mimeType && /^image\/.+$/.test(mimeType)) return this.queue.add(async () => {
			Object.assign(config, { responseType: "arraybuffer" })

			/** @type {import("axios").AxiosResponse<Buffer>} */
			const response = await this.Request(url, "GET", config)
			const { data, status } = response

			if(status < 200 || status >= 300){
				Log(new Error(`Request to media ${filename} failed with status ${status}`))
				return
			}

			const { format } = await sharp(data).metadata()
			const path = join(folder, `${name}.${format === "jpeg" ? "jpg" : format}`)

			await writeFile(path, data)
			utimes(path, date, date)

			return path
		})

		return this.queue.add(async () => {
			Object.assign(config, { responseType: "stream" })

			/** @type {import("axios").AxiosResponse<import("stream").PassThrough>} */
			const { data } = await this.Request(url, "GET", config)

			return new Promise((resolve, reject) => {
				const path = join(folder, filename)
				const file = createWriteStream(path)

				file.on("close", async () => {
					try{
						await utimes(path, date, date)
						resolve(path)
					}catch(error){
						reject(error)
					}
				})

				file.on("error", reject)
				data.pipe(file)
			})
		})
	}
	/**
	 * @template T
	 * @param {string} url
	 * @param {"GET" | "POST"} [method]
	 * @param {Omit<import("axios").AxiosRequestConfig, "url" | "method">} [config]
	 */
	async Request(url, method = "GET", config = {}){
		const headers = AxiosHeaders.from(this.headers)

		if(config.headers){
			if(config.headers instanceof AxiosHeaders){
				for(const [key, value] of Object.entries(config.headers.toJSON())){
					headers.set(key, value)
				}
			}else{
				for(const [key, value] of Object.entries(config.headers)){
					if(value !== null && value !== undefined && typeof value !== "object"){
						headers.set(key, String(value))
					}
				}
			}
		}

		try{
			/** @type {import("axios").AxiosResponse<T>} */
			const response = await api({
				url,
				method,
				validateStatus: () => true,
				...config,
				headers
			})

			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			if(!this.config){
				this.SetConfig()
			}

			for(const cookieConfig of /** @type {import("axios").AxiosResponseHeaders} */ (response.headers).getSetCookie()){
				const [key, ...values] = cookieConfig.split(";")[0].split("=")

				if(key === "th_eu_pref"){
					continue
				}

				const value = encodeURIComponent(values.join("="))

				this.config.cookie[key] = value
			}

			await this.WriteConfig()

			return response
		}catch(error){
			throw error instanceof Error ? new Error(error.name.replace(/\[?Error\]?:? ?/, ""), { cause: error.message }) : error
		}
	}
	async CheckServerConfig(){
		const { config } = this

		const response = await this.Request("/", "GET", { responseType: "text" })

		if(typeof response.data === "string"){
			const appId = response.data.match(/"X-IG-App-ID":"(\d+)"/)?.[1]

			if(appId){
				config.app_id = appId
			}else if(isTesting || !config.app_id){
				throw new Error("App ID was not found")
			}

			const fbDtsg = response.data.match(/"DTSGInitData",\[\],\{"token":"([-\w:]+)"/)?.[1]
			// /(?:(?:"DTSGInit(?:ial)?Data",\[\],|"dtsg":)\{"token":"|"s":"XPolarisProfileController","w":\d+,"f":")([-\w:]+)"/

			if(fbDtsg){
				config.fb_dtsg = fbDtsg
			}else if(isTesting || !config.fb_dtsg){
				throw new Error("fb_dtsg was not found")
			}

			this.UpdateHeaders()
		}
	}
}
