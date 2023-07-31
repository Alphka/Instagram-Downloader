import { mkdir, readdir, rm } from "fs/promises"
import { fileURLToPath } from "url"
import { dirname, join } from "path"
import { existsSync } from "fs"
import { test } from "node:test"
import Downloader from "../src/Downloader.js"
import assert from "assert"
import "dotenv/config"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const {
	TOKEN,
	USER_ID,
	SESSION_ID
} = process.env

if(!TOKEN) throw new Error("TOKEN must be set in process.env")
if(!USER_ID) throw new Error("USER_ID must be set in process.env")
if(!SESSION_ID) throw new Error("SESSION_ID must be set in process.env")

const username = "instagram"
const root = join(__dirname, "..")
const output = join(root, "output")
const folder = join(output, username)

test("Instagram API", async t => {
	const downloader = new Downloader(username)

	await t.test("should reject if user is not logged in", async () => {
		await assert.rejects(downloader.CheckLogin.bind(downloader))
	})

	await t.test("should create config object", async () => {
		const config = downloader.GetConfig()

		assert.ok(typeof config === "object")
		assert.ok(typeof config.cookie === "object")
	})

	downloader.config.csrftoken = downloader.config.cookie.csrftoken = TOKEN
	downloader.config.cookie.ds_user_id = USER_ID
	downloader.config.cookie.sessionid = SESSION_ID

	await t.test("should update headers", () => {
		downloader.UpdateHeaders()

		assert.ok(typeof downloader.headers === "object")
		assert.ok(typeof downloader.headers.Cookie === "string")
		assert.ok(downloader.headers.Cookie.includes("ds_user_id"))
		assert.ok(downloader.headers.Cookie.includes("sessionid"))
		assert.strictEqual(downloader.headers["X-Csrftoken"], TOKEN)
	})

	await t.test("should get app id", async () => {
		await downloader.CheckServerConfig()

		const { app_id, queryHash } = downloader.config

		assert.ok(typeof app_id === "string")
		assert.strictEqual(downloader.headers["X-Ig-App-Id"], app_id)

		assert.ok(typeof queryHash === "string")
		assert.ok(/^[a-z0-9]+$/.test(queryHash))

		if(app_id !== "936619743392459") t.diagnostic("App id has changed")
	})

	await t.test("should check if user is logged in", async () => {
		await downloader.CheckLogin()
	})

	await t.test("should get user id", async () => {
		const userId = await downloader.GetUserId("instagram")

		assert.ok(typeof userId === "string")
		assert.strictEqual(userId, "25025320")
	})

	async function EmptyFolder(){
		const contents = await readdir(folder, { withFileTypes: true })

		await Promise.all(contents.map(content => {
			const path = join(folder, content.name)
			return rm(path, { recursive: content.isFile() })
		}))
	}

	await t.test("Download", async t => {
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
	})
})
