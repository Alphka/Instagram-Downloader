import { fileURLToPath } from "url"
import { dirname, join } from "path"
import { existsSync } from "fs"
import { test } from "node:test"
import ValidateUsername from "../src/helpers/ValidateUsername.js"
import Downloader from "../src/Downloader.js"
import assert from "assert"
import "dotenv/config"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const hasConfigFile = existsSync(join(__dirname, "config.json"))

const {
	TOKEN,
	USER_ID,
	SESSION_ID,
	COOKIES
} = process.env

if(!TOKEN) throw new Error("TOKEN must be set in process.env")
if(!USER_ID) throw new Error("USER_ID must be set in process.env")
if(!SESSION_ID) throw new Error("SESSION_ID must be set in process.env")

if(!COOKIES && !hasConfigFile){
	console.warn("COOKIES was not set in process.env, the tests may fail")
}

test("Username validation", t => {
	t.test("should throw with invalid usernames", () => {
		assert.throws(() => ValidateUsername("instagram-"), "hyphens are not allowed")
		assert.throws(() => ValidateUsername("instagram/"), "slashes are not allowed")
		assert.throws(() => ValidateUsername("@instagram"), "symbols are not allowed")
		assert.throws(() => ValidateUsername("instagram "), "trailing spaces are not allowed")
		assert.throws(() => ValidateUsername(" instagram"), "trailing spaces are not allowed")
		assert.throws(() => ValidateUsername("instagram."), "trailing dots are not allowed")
		assert.throws(() => ValidateUsername(".instagram"), "trailing dots are not allowed")
		assert.throws(() => ValidateUsername("instagr..am"), "two or more consecutive dots are not allowed")
		assert.throws(() => ValidateUsername("instagr...am"), "two or more consecutive dots are not allowed")
		assert.throws(() => ValidateUsername("instagraaaaaaaaaaaaaaaaaaaaaaam"), "the length must be between 1 and 64 characters")
	})

	t.test("should pass with valid usernames", () => {
		assert.doesNotThrow(() => ValidateUsername("instagram"))
		assert.doesNotThrow(() => ValidateUsername("instagram_"))
		assert.doesNotThrow(() => ValidateUsername("_instagram"))
		assert.doesNotThrow(() => ValidateUsername("instagram.23"))
	})
})

test("Instagram API", async t => {
	const username = "instagram"
	const downloader = new Downloader(username, 12)

	t.test("should create config object", () => {
		const config = downloader.SetConfig()

		assert.strictEqual(typeof config, "object")
		assert.strictEqual(typeof config.cookie, "object")
	})

	/* await t.test("should reject if user is not logged in", async () => {
		await assert.rejects(downloader.CheckLogin.bind(downloader))
	}) */

	t.test("should update headers", () => {
		downloader.config.cookie.csrftoken = TOKEN
		downloader.config.cookie.ds_user_id = USER_ID
		downloader.config.cookie.sessionid = SESSION_ID

		downloader.UpdateHeaders()

		assert.strictEqual(typeof downloader.headers, "object")
		assert.strictEqual(typeof downloader.headers.Cookie, "string")
		assert.match(downloader.headers.Cookie, /\bds_user_id=\d/)
		assert.match(downloader.headers.Cookie, /\bsessionid=\d/)
		assert.strictEqual(downloader.headers["X-Csrftoken"], TOKEN)
	})

	await t.test("should get app id", async () => {
		await downloader.CheckServerConfig()
		downloader.UpdateHeaders()

		const { app_id } = downloader.config

		assert.strictEqual(typeof app_id, "string")
		assert.strictEqual(downloader.headers["X-Ig-App-Id"], app_id)

		if(app_id !== "936619743392459") t.diagnostic("App ID has changed: " + app_id)
	})

	/* await t.test("should check if user is logged in", async () => {
		await downloader.CheckLogin()
	}) */

	await t.test("should get user id", async () => {
		const userId = await downloader.GetUserId("instagram")

		assert.strictEqual(typeof userId, "string")
		assert.strictEqual(userId, "25025320")
	})

	/* await t.test("Download", async t => {
		async function EmptyFolder(){
			const contents = await readdir(folder, { withFileTypes: true })

			await Promise.all(contents.map(content => {
				const path = join(folder, content.name)
				return rm(path, { recursive: content.isFile() })
			}))
		}

		if(existsSync(folder)) await EmptyFolder()
		else await mkdir(folder, { recursive: true })

		await t.test("should download 20 items from timeline", async () => {
			await downloader.DownloadTimeline("instagram", folder, 20)
			assert.strictEqual((await readdir(folder)).length, 20)
		})

		await EmptyFolder()

		await t.test("should download 20 items from highlights", async () => {
			await downloader.DownloadHighlights("25025320", folder, true, 20)
			assert.strictEqual((await readdir(folder)).length, 20)
		})

		await rm(folder, { recursive: true })
	}) */
})
