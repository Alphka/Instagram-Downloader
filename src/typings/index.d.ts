export interface Config {
	app_id?: string
	csrftoken?: string
	queryHash?: string
	cookie: {
		[key: string]: string
	}
}
