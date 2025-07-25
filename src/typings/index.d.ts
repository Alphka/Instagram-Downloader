export interface Config {
	app_id?: string
	cookie: {
		[key: string]: string
	}
}

export interface Options {
	highlights: boolean
	withThumbs: boolean
	timeline: boolean
	flatDir: boolean
	stories: boolean
	hcover: boolean
	debug: boolean
	force: boolean
	queue: 12 | string
	output?: string
	limit?: string
}
