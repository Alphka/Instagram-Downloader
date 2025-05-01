export interface Config {
	app_id?: string
	csrftoken?: string
	cookie: {
		[key: string]: string
	}
}

export interface Options {
	output?: string
	force: boolean
	queue: 12 | string
	limit?: string
	stories: boolean
	timeline: boolean
	highlights: boolean
	hcover: boolean
	debug: boolean
}
