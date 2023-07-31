import { BASE_URL, API_FACEBOOK_ACCOUNT, API_USERID_TEMPLATE, API_QUERY, API_REELS, API_FEED_TEMPLATE } from "./config.js"
import { existsSync, readFileSync, writeFileSync, createWriteStream } from "fs"
import { mkdir, writeFile, utimes } from "fs/promises"
import { dirname, join, parse } from "path"
import { fileURLToPath } from "url"
import GetCorrectContent from "./helpers/GetCorrectContent.js"
import GetURLFilename from "./helpers/GetURLFilename.js"
import Question from "./helpers/Question.js"
import axios, { AxiosError } from "axios"
import chalk from "chalk"
import sharp from "sharp"
import mime from "mime"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const root = join(__dirname, "..")
const configPath = join(root, "config.json")

const isTesting = process.env.npm_command === "test"

export default class Downloader {
	/** @type {import("./typings/api.js").APIHeaders} */ headers
	/** @type {import("./typings/index.js").Config} */ config
	/** @type {string[]} */ usernames
	/** @type {number} */ limit
	/** @type {string} */ output

	/**
	 * @param {string | string[]} usernames
	 * @param {number} [limit]
	 */
	constructor(usernames, limit = 15){
		this.usernames = Array.isArray(usernames) ? usernames : [usernames]
		this.limit = limit

		// TODO: Add an array with the downloads queue

		this.headers = {
			Accept: "*/*",
			Origin: BASE_URL
		}
	}
	GetConfig(){
		if(!existsSync(configPath)){
			/** @type {import("./typings/index.js").Config} */
			const config = this.config = { cookie: {} }
			if(!isTesting) this.SetConfig(true)
			return config
		}

		const config = JSON.parse(readFileSync(configPath, "utf8"))

		if(!config || typeof config !== "object") throw new TypeError("Invalid type from config.json")
		if(!config.cookie) config.cookie = {}

		return this.config = /** @type {import("./typings/index.js").Config} */ (config)
	}
	SetConfig(sync = false){
		const data = JSON.stringify(this.config, null, "\t") + "\n"
		return (sync ? writeFileSync : writeFile)(configPath, data, "utf8")
	}
	UpdateHeaders(){
		const { headers, config: { csrftoken, app_id, cookie } } = this

		if(csrftoken) headers["X-Csrftoken"] = csrftoken
		if(app_id) headers["X-Ig-App-Id"] = app_id

		headers.Cookie = Object.entries(cookie).map(([key, value]) => `${key}=${value ?? ""}`).join("; ")
	}
	/** @param {{
	 * 	output: string
	 * 	timeline?: boolean
	 * 	highlights?: boolean
	 * 	stories?: boolean
	 * 	cover?: boolean
	 * }} data */
	async Init({ output, timeline, highlights, cover, stories }){
		this.Log("Initializing")
		this.GetConfig()
		this.UpdateHeaders()

		// TODO: Add stories download

		do{
			try{
				await this.CheckServerConfig()
				await this.CheckLogin()
				this.Log("Logged in")
				break
			}catch{
				this.Log(new Error("You are not logged in. Type your data for authentication."))

				const id = (await Question("User id: ")).trim()
				const token = (await Question("CSRF Token: ")).trim()
				const session = (await Question("Session id: ")).trim()

				if(!token || !id || !session) continue

				this.config.csrftoken = token
				this.config.cookie.ds_user_id = id
				this.config.cookie.csrftoken = token
				this.config.cookie.sessionid = session

				this.UpdateHeaders()
				await this.SetConfig()
			}
		}while(true)

		for(const username of this.usernames){
			let user_id

			try{
				const { id, followed_by_viewer, is_private } = await this.GetUser(username)

				if(is_private && !followed_by_viewer){
					this.Log(new Error(`You don't have access to a private account: ${username}`))
					continue
				}

				user_id = id
			}catch(error){
				if(error instanceof Error) error.message = `User not found: ${username}`
				this.Log(error)
			}

			this.Log(`Downloading from user: ${username}, id: ${user_id}`)

			const folder = join(output, username)

			const results = await Promise.allSettled([
				timeline && this.DownloadTimeline(username, folder),
				highlights && this.DownloadHighlights(user_id, folder, cover)
			])

			for(const result of results){
				if(result.status === "rejected"){
					const { reason } = result
					if(reason instanceof Error) reason.stack = `Failed to download user's content: ${username}`
					this.Log(reason)
				}
			}
		}
	}
	async CheckLogin(){
		/** @type {import("axios").AxiosResponse<import("./typings/api.js").FacebookAccountAPIResponse>} */
		const response = await this.Request(new URL(API_FACEBOOK_ACCOUNT, BASE_URL), "POST", {
			headers: { Referer: BASE_URL + "/" },
			responseType: "json"
		})

		if(typeof response.data === "object" && "status" in response.data){
			const { fbAccount, status } = response.data
			if(status === "ok" && Boolean(fbAccount)) return
		}

		throw new Error("User is not logged in")
	}
	/** @param {string} username */
	async GetUser(username){
		/** @type {import("axios").AxiosResponse<import("./typings/api.js").QueryUserAPIResponse>} */
		const response = await this.Request(new URL(API_USERID_TEMPLATE.replace("<username>", username), BASE_URL), "GET", {
			headers: { Referer: `${BASE_URL}/${username}/` },
			responseType: "json"
		})

		if(typeof response.data === "object"){
			const { user } = response.data.data
			return user
		}

		return null
	}
	/** @param {string} username */
	async GetUserId(username){
		const { id } = await this.GetUser(username)
		return id
	}
	/** @param {string} user_id */
	async GetHighlights(user_id){
		const url = new URL(API_QUERY, BASE_URL)
		const data = new URLSearchParams

		data.set("query_hash", this.config.queryHash)
		data.set("user_id", user_id)
		data.set("include_chaining", "false")
		data.set("include_reel", "false")
		data.set("include_suggested_users", "false")
		data.set("include_logged_out_extras", "false")
		data.set("include_live_status", "false")
		data.set("include_highlight_reels", "true")

		url.search = data.toString()

		/** @type {import("axios").AxiosResponse<import("./typings/api.js").QueryHighlightsResponse>} */
		const response = await this.Request(url, "GET", {
			headers: { "X-Requested-With": "XMLHttpRequest" },
			responseType: "json"
		})

		return response.data.data.user.edge_highlight_reels.edges.map(({ node }) => node)
	}
	/** @param {string[]} reelsIds */
	async GetHighlightsContents(reelsIds){
		const url = new URL(API_REELS, BASE_URL)
		const data = new URLSearchParams

		for(const id of reelsIds) data.append("reel_ids", "highlight:" + id)

		url.search = data.toString()

		/** @type {import("axios").AxiosResponse<import("./typings/api.js").HighlightsAPIResponse>} */
		const response = await this.Request(url, "GET", {
			responseType: "json"
		})

		return response.data.reels_media
	}
	/**
	 * @param {string} user_id
	 * @param {string} folder
	 * @param {boolean} [cover]
	 * @param {number} [limit]
	 */
	async DownloadHighlights(user_id, folder, cover, limit = Infinity){
		const highlights = await this.GetHighlights(user_id)

		const highlightsMap = new Map(highlights.map(reel => [reel.id, reel]))

		const filesSet = /** @type {Set<string>} */ (new Set)
		let hasHighlights = Boolean(highlights.length)
		let count = 0

		if(hasHighlights && !existsSync(folder)) await mkdir(folder, { recursive: true })

		this.Log("Downloading highlights")
		while(highlights.length && limit > count){
			const ids = highlights.splice(0, 10).map(({ id }) => id)
			const highlightsContents = await this.GetHighlightsContents(ids)

			if(!highlightsContents) throw new Error("No highlights found. The request might have been forbidden")

			if(!highlightsContents.length){
				hasHighlights = false
				break
			}

			for(const { id, items } of highlightsContents){
				if(count > limit){
					console.log("Should not be here")
					break
				}

				const highlightId = /** @type {`${number}`} */ (id.substring(id.indexOf(":") + 1))

				this.Log(`Downloading highlight: ${highlightId}`)

				for(const item of items){
					const { url } = GetCorrectContent(item)[0]
					filesSet.add(GetURLFilename(url))
				}

				let shouldDownloadCover = cover && highlightsMap.has(highlightId)
				let coverUrl

				if(shouldDownloadCover){
					const { thumbnail_src: url } = highlightsMap.get(highlightId).cover_media
					coverUrl = url
				}

				const data = { count, limit }
				const { urls, limited } = await this.DownloadItems(items, folder, data)

				count = data.count

				// Might not download cover if limit is set
				if(shouldDownloadCover && coverUrl && !urls.has(coverUrl) && !(count === limit || limited)){
					const coverFilename = GetURLFilename(coverUrl)
					const filenames = Array.from(urls).map(GetURLFilename)

					if(!filenames.includes(coverFilename)){
						count++
						await this.Download(coverUrl, folder, new Date)
					}
				}

				if(limited) break
			}
		}

		if(hasHighlights){
			if(count === 0) this.Log("No content found in the highlights")
		}else this.Log("No highlights found")
	}
	/**
	 * @param {string} username
	 * @param {string} folder
	 * @param {number} [limit]
	 */
	async DownloadTimeline(username, folder, limit = Infinity){
		const url = new URL(API_FEED_TEMPLATE.replace("<username>", username), BASE_URL)

		url.searchParams.set("count", "12")

		/** @type {string} */
		let lastId
		let count = 0
		let hasMore = true

		this.Log("Downloading timeline")
		while(hasMore && limit > count){
			if(lastId) url.searchParams.set("max_id", lastId)

			/** @type {import("axios").AxiosResponse<import("./typings/api.js").FeedAPIResponse>} */
			const response = await this.Request(url)
			const { more_available, num_results, next_max_id, items } = response.data

			if(num_results === 0) break

			if(!existsSync(folder)) await mkdir(folder, { recursive: true })

			const data = { count, limit }
			const { limited } = await this.DownloadItems(items, folder, data)

			if(limited) break

			hasMore = more_available
			lastId = next_max_id
			count = data.count
		}

		if(count === 0) this.Log("No content found in timeline")
	}
	/**
	 * @param {import("./typings/api.js").FeedItem[]} items
	 * @param {string} folder
	 * @param {object} [data]
	 * @param {number} data.count
	 * @param {number} data.limit
	 */
	async DownloadItems(items, folder, data){
		/** @type {Map<string, Date>} */
		const urls = new Map

		let shouldLimit = data && typeof data.limit === "number"
		let limited = false

		if(shouldLimit && !data.limit) return {
			urls: /** @type {Set<string>} */ (new Set),
			limited: true
		}

		/**
		 * @param {typeof items[number]} item
		 * @param {Date} date
		 */
		function Carousel(item, date){
			for(const media of item.carousel_media){
				if(shouldLimit && data.count >= data.limit){
					limited = true
					break
				}

				const { url } = GetCorrectContent(media)[0]
				urls.set(url, date)

				data.count++
			}
		}

		for(const item of items){
			if(shouldLimit && data.count >= data.limit){
				limited = true
				break
			}

			const date = new Date(item.taken_at * 1000)

			if(item.carousel_media_count){
				Carousel(item, date)
				if(limited) break
				continue
			}

			const { url } = GetCorrectContent(item)[0]
			urls.set(url, date)

			data.count++
		}

		await Promise.all(Array.from(urls.entries()).map(([url, date]) =>
			this.Download(url, folder, date)
		))

		return {
			urls: new Set(urls.keys()),
			limited
		}
	}
	/**
	 * @param {string} url
	 * @param {string} folder
	 * @param {Date} [date]
	 * @param {string} [filename]
	 * @param {import("axios").AxiosRequestConfig} [config]
	 * @returns {Promise<string>}
	 */
	async Download(url, folder, date = new Date, filename, config){
		if(!config) config = {}
		if(!filename) filename = GetURLFilename(url)

		const { name, ext } = parse(filename)

		if(/^image\/.+$/.test(mime.getType(ext))){
			Object.assign(config, { responseType: "arraybuffer" })

			/** @type {import("axios").AxiosResponse<Buffer>} */
			const { data } = await axios.get(url, config)
			const { format } = await sharp(data).metadata()
			const path = join(folder, `${name}.${format === "jpeg" ? "jpg" : format}`)

			await writeFile(path, data)
			await utimes(path, date, date)

			return path
		}

		Object.assign(config, { responseType: "stream" })

		/** @type {import("axios").AxiosResponse<import("stream").PassThrough>} */
		const { data } = await axios.get(url, config)
		const path = join(folder, filename)
		const file = createWriteStream(path)

		return new Promise((resolve, reject) => {
			file.on("close", () => utimes(path, date, date).then(() => resolve(path)).catch(reject))
			file.on("error", reject)
			data.pipe(file)
		})
	}
	/**
	 * @template T
	 * @param {string | URL} url
	 * @param {"GET" | "POST"} [method]
	 * @param {Omit<import("axios").AxiosRequestConfig, "url" | "method">} [config]
	 */
	async Request(url, method = "GET", config = {}){
		config.headers = Object.assign({}, this.headers, config.headers ?? {})

		/** @type {import("axios").AxiosResponse<T>} */
		let response

		const handleCookies = async () => {
			const setCookies = response.headers["set-cookie"]

			if(!setCookies) return

			setCookies.forEach(cookieConfig => {
				const [key, ...values] = cookieConfig.split(";")[0].split("=")
				const value = encodeURIComponent(values.join("="))
				if(key === "csrftoken") this.config.csrftoken = value
				this.config.cookie[key] = value
			})

			this.UpdateHeaders()
			if(!isTesting) await this.SetConfig()
		}

		try{
			response = await axios({
				url: url instanceof URL ? url.href : url,
				method,
				...config
			})

			await handleCookies()

			return response
		}catch(error){
			if(error instanceof AxiosError){
				if(error.response){
					response = error.response
					await handleCookies()
					return response
				}
			}

			throw error
		}
	}
	async CheckServerConfig(){
		const { config, usernames } = this

		if(config.app_id && config.queryHash) return

		const response = await this.Request(new URL(usernames[0], BASE_URL), "GET", { responseType: "text" })
		const appId = response.data.match(/X-IG-App-ID":"(\d+)"/)?.[1]
		const queryHash = response.data.match(/"query_hash":"([a-z0-9]+)"/)?.[1]

		config.queryHash = queryHash
		config.app_id = appId
	}
	Log(...args){
		if(isTesting) return

		const date = new Date(new Date().toString().replace(/GMT-\d{4}/, "GMT-0000")).toISOString().split("T")[1].substring(0, 8)

		if(args.length === 1 && args[0] instanceof Error) return console.error(chalk.redBright(`[${date}] ${args[0].message}`))

		process.stdout.write(chalk.blackBright(`[${date}] `))
		console.log(...args)
	}
}
