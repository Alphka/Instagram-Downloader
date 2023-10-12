export interface Config {
	app_id?: string
	csrftoken?: string
	queryHash?: string
	cookie: {
		[key: string]: string
	}
}

export interface Options {
	output?: string
	force: boolean
	queue: 12 | string
	stories: boolean
	timeline: boolean
	highlights: boolean
	hcover: boolean
}
