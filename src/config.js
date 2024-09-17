export const BASE_URL = "https://www.instagram.com"
export const API_QUERY = "/graphql/query"
export const API_REELS = "/api/v1/feed/reels_media"
export const API_GRAPHQL = "/api/graphql"
export const API_FEED_TEMPLATE = "/api/v1/feed/user/<username>/username"
export const API_FACEBOOK_ACCOUNT = "/api/v1/web/fxcal/ig_sso_users/"

const config = {
	argument: {
		name: "<username>",
		description: "Username or list of usernames"
	},
	options: [
		{
			option: "output",
			alternative: "o",
			description: "Output directory",
			syntax: "[path]"
		},
		{
			option: "force",
			alternative: "f",
			description: "Force creation of output directory",
			defaultValue: false
		},
		{
			option: "open",
			alternative: "O",
			description: "Open output folders when finished",
			defaultValue: false
		},
		{
			option: "unifolder",
			alternative: "uf",
			description: "Downloads the contents in the parent folder, instead of subdirectories.",
			defaultValue: false
		},
		{
			option: "queue",
			alternative: "q",
			description: "Set how many items to get from Instagram API",
			defaultValue: 12,
			syntax: "<number>"
		},
		{
			option: "limit",
			alternative: "l",
			description: "Set how many items to download in total",
			syntax: "<number>"
		},
		{
			option: "no-stories",
			alternative: "ns",
			description: "Disable stories download"
		},
		{
			option: "no-timeline",
			alternative: "nt",
			description: "Disable timeline download"
		},
		{
			option: "no-highlights",
			alternative: "nh",
			description: "Disable highlights download"
		},
		{
			option: "no-hcover",
			alternative: "nhc",
			description: "Disable highlights' cover download"
		}
	]
}

export default config
