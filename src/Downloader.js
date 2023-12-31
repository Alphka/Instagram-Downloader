import { BASE_URL, API_FACEBOOK_ACCOUNT, API_USERID_TEMPLATE, API_QUERY, API_REELS, API_FEED_TEMPLATE } from "./config.js"
import { existsSync, readFileSync, writeFileSync, createWriteStream } from "fs"
import { mkdir, writeFile, utimes } from "fs/promises"
import { dirname, join, parse } from "path"
import { fileURLToPath } from "url"
import GetCorrectContent from "./helpers/GetCorrectContent.js"
import GetURLFilename from "./helpers/GetURLFilename.js"
import Question from "./helpers/Question.js"
import axios, { AxiosError } from "axios"
import dotenv from "dotenv"
import chalk from "chalk"
import sharp from "sharp"
import mime from "mime"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const root = join(__dirname, "..")
const configPath = join(root, "config.json")

const isTesting = process.env.npm_command === "test" || process.env.npm_lifecycle_event === "test"

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

		if(sync){
			writeFileSync(configPath, data, "utf8")
			this.SetEnv(true)
			return
		}

		return writeFile(configPath, data, "utf8")
			.then(() => this.SetEnv())
	}
	SetEnv(sync = false){
		const { config } = this
		const envPath = join(root, ".env")
		const data = existsSync(envPath) ? dotenv.parse(envPath) : {}

		/** @type {Record<string, string>} */
		let newData = {
			TOKEN: config.csrftoken,
			USER_ID: config.cookie.ds_user_id,
			SESSION_ID: config.cookie.sessionid
		}

		newData = Object.fromEntries(Object.entries(newData).filter(([key, value]) => value))

		Object.assign(data, newData)

		const envString = Object.entries(data).map(([key, value]) => `${key}=${value}`).join("\n") + "\n"

		if(sync) writeFileSync(envPath, envString, "utf8")
		else return writeFile(envPath, envString, "utf8")
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
	 * 	hcover?: boolean
	 * }} data */
	async Init({ output, timeline, highlights, hcover, stories }){
		this.Log("Initializing")
		this.GetConfig()
		this.UpdateHeaders()

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
				this.SetConfig(true)
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
				continue
			}

			this.Log(`Downloading from user: ${username}, id: ${user_id}`)

			const folder = join(output, username)

			const results = await Promise.allSettled([
				timeline && this.DownloadTimeline(username, folder),
				highlights && this.DownloadHighlights(user_id, folder, hcover),
				stories && this.DownloadStories(user_id, folder)
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

		if(typeof response?.data === "object" && "status" in response.data){
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

		if(typeof response?.data === "object" && "user" in response.data.data){
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

		url.searchParams.set("query_hash", this.config.queryHash)
		url.searchParams.set("user_id", user_id)
		url.searchParams.set("include_chaining", "false")
		url.searchParams.set("include_reel", "false")
		url.searchParams.set("include_suggested_users", "false")
		url.searchParams.set("include_logged_out_extras", "false")
		url.searchParams.set("include_live_status", "false")
		url.searchParams.set("include_highlight_reels", "true")

		/** @type {import("axios").AxiosResponse<import("./typings/api.js").QueryHighlightsResponse>} */
		const response = await this.Request(url, "GET", {
			headers: { "X-Requested-With": "XMLHttpRequest" },
			responseType: "json"
		})

		return response.data.data.user.edge_highlight_reels.edges.map(({ node }) => node)
	}
	/** @param {`${number}`[]} reelsIds */
	async GetHighlightsContents(reelsIds){
		const url = new URL(API_REELS, BASE_URL)

		for(const id of reelsIds) url.searchParams.append("reel_ids", "highlight:" + id)

		/** @type {import("axios").AxiosResponse<import("./typings/api.js").HighlightsAPIResponse>} */
		const response = await this.Request(url, "GET", {
			responseType: "json"
		})

		return response.data.reels_media
	}
	/** @param {`${number}`} userId */
	async GetStories(userId){
		const url = new URL(API_REELS, BASE_URL)

		url.searchParams.set("reel_ids", userId)

		/** @type {import("axios").AxiosResponse<import("./typings/api.js").StoriesAPIResponse>} */
		const response = await this.Request(url, "GET", {
			responseType: "json"
		})

		if(typeof response?.data === "object"){
			const { reels, reels_media } = response.data
			return reels_media.length ? reels[userId] : null
		}

		return null
	}
	/**
	 * @param {string} user_id
	 * @param {string} folder
	 * @param {boolean} [hcover]
	 * @param {number} [limit]
	 */
	async DownloadHighlights(user_id, folder, hcover, limit = Infinity){
		const highlights = await this.GetHighlights(user_id)

		const highlightsMap = new Map(highlights.map(reel => [reel.id, reel]))

		const filesSet = /** @type {Set<string>} */ (new Set)
		let hasHighlights = Boolean(highlights.length)
		let count = 0

		if(hasHighlights && !existsSync(folder)) await mkdir(folder, { recursive: true })

		while(highlights.length && limit > count){
			const ids = highlights.splice(0, 10).map(({ id }) => id)
			const highlightsContents = await this.GetHighlightsContents(ids)

			if(!highlightsContents) throw new Error("No highlights found. The request might have been forbidden")

			if(!highlightsContents.length){
				hasHighlights = false
				break
			}

			for(const { id, items } of highlightsContents){
				if(count > limit) throw new Error("Unexpected error")

				const highlightId = /** @type {`${number}`} */ (id.substring(id.indexOf(":") + 1))

				this.Log(`Downloading highlight: ${highlightId}`)

				for(const item of items){
					const { url } = GetCorrectContent(item)[0]
					filesSet.add(GetURLFilename(url))
				}

				const shouldDownloadCover = hcover && highlightsMap.has(highlightId)
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

						try{
							await this.Download(coverUrl, folder, new Date)
						}catch(error){
							this.Log(error)
						}
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
	 * @param {string} user_id
	 * @param {string} folder
	 * @param {number} [limit]
	 */
	async DownloadStories(user_id, folder, limit = Infinity){
		const results = await this.GetStories(/** @type {`${number}`} */ (user_id))

		if(!results) return this.Log("No stories found")

		const { items: stories } = results

		if(stories.length){
			if(!existsSync(folder)) await mkdir(folder, { recursive: true })
			this.Log("Downloading stories")
		}

		let count = 0

		while(stories.length && limit > count){
			const items = stories.splice(0, 10)
			const data = { count, limit }
			const { limited } = await this.DownloadItems(items, folder, data)

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
		const url = new URL(API_FEED_TEMPLATE.replace("<username>", username), BASE_URL)

		url.searchParams.set("count", "12")

		/** @type {string} */
		let lastId
		let first = true
		let count = 0
		let hasMore = true

		while(hasMore && limit > count){
			if(lastId) url.searchParams.set("max_id", lastId)

			/** @type {import("axios").AxiosResponse<import("./typings/api.js").FeedAPIResponse>} */
			const response = await this.Request(url)

			if(typeof response?.data === "object"){
				const { more_available, num_results, next_max_id, items } = response.data

				if(num_results === 0) break

				if(first){
					this.Log("Downloading timeline")
					first = false
				}

				if(!existsSync(folder)){
					await mkdir(folder, { recursive: true })
				}

				const data = { count, limit }
				const { limited } = await this.DownloadItems(items, folder, data)

				if(limited) break

				hasMore = more_available
				lastId = next_max_id
				count = data.count
			}else this.Log(new Error("Failed to get timeline, lastId: " + (lastId || null)))
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

		const shouldLimit = data && typeof data.limit === "number"
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

		await Promise.all(Array.from(urls.entries()).map(async ([url, date]) => {
			try{
				await this.Download(url, folder, date)
			}catch(error){
				this.Log(error)
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
			const { data, status } = await this.Request(url, "GET", config)

			if(status < 200 || status >= 300) throw new Error(`Request to media ${filename} failed with status ${status}`)

			const { format } = await sharp(data).metadata()
			const path = join(folder, `${name}.${format === "jpeg" ? "jpg" : format}`)

			await writeFile(path, data)
			await utimes(path, date, date)

			return path
		}

		Object.assign(config, { responseType: "stream" })

		/** @type {import("axios").AxiosResponse<import("stream").PassThrough>} */
		const { data } = await this.Request(url, "GET", config)
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
			const setCookies = response?.headers["set-cookie"]

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
			// TODO: Handle axios errors in test mode to prevent token's leakage
			if(error instanceof AxiosError){
				if(error.response){
					response = error.response
					await handleCookies()
					return error.response
				}
			}

			throw error
		}
	}
	async CheckServerConfig(){
		const { config, usernames } = this

		if(config.app_id && config.queryHash) return

		const response = await this.Request(new URL(usernames[0], BASE_URL), "GET", { responseType: "text" })

		if(typeof response?.data === "string"){
			const appId = response.data.match(/"X-IG-App-ID":"(\d+)"/)?.[1]
			const queryHash = response.data.match(/"query_hash":"([a-z0-9]+)"/)?.[1]

			config.queryHash = queryHash
			config.app_id = appId
		}
	}
	Log(...args){
		if(isTesting) return

		const date = new Date().toLocaleString("pt-BR").split(", ")[1]

		if(args.length === 1){
			const arg = args[0]
			if(arg instanceof Error) return console.error(chalk.redBright(`[${date}] ${args[0].message}`))
			if(typeof arg === "string") return console.log(`${chalk.blackBright(`[${date}]`)} ${arg}`)
		}

		console.log(chalk.blackBright(`[${date}] `), ...args)
	}
}
