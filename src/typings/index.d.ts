export interface Config {
	cookie: {
		[key: string]: string
	}
	app_id?: string
	fb_dtsg?: string
}

export interface Options {
	debug: boolean
	force: boolean
	queue: 12 | string
	limit?: string
	hcover: boolean
	output?: string
	flatDir: boolean
	stories: boolean
	timeline: boolean
	withThumbs: boolean
	highlights: boolean
}
