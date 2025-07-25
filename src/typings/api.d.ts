export interface APIHeaders {
	[key: string]: string
	"viewport-width"?: string
	"X-Ig-Www-Claim"?: string
	"X-Requested-With"?: "XMLHttpRequest"
	"X-Asbd-Id"?: string
	"X-Ig-App-Id"?: string
	"X-Csrftoken"?: string
	"X-Fb-Friendly-Name"?: string
	"X-Fb-Lsd"?: string
	"Sec-Ch-Prefers-Color-Scheme"?: string
	"Sec-Ch-Ua"?: string
	"Sec-Ch-Ua-Full-version-list"?: string
	"Sec-Ch-Ua-Mobile"?: string
	"Sec-Ch-Ua-Model"?: string
	"Sec-Ch-Ua-Platform"?: string
	"Sec-Ch-Ua-Platform-version"?: string
	"Sec-Fetch-Dest"?: string
	"Sec-Fetch-Mode"?: string
	"Sec-Fetch-Site"?: string
	DPR?: "1"
	Cookie?: string
}

type AdditionalCandidates<T extends ImageVersion | VideoVersion> = {
	igtv_first_frame: T
	first_frame: T
	smart_frame: T | null
}

export interface MediaVersion {
	width: number
	height: number
	url: string
}

export interface ImageVersion extends MediaVersion {}

export interface VideoVersion extends MediaVersion {
	type: number
	id: string
}

export interface GenericUser {
	id: `${number}` | null
	pk: string
	pk_id: string
	username: string | null
	full_name: string
	is_private: boolean
	is_verified: boolean
	profile_pic_id: string
	profile_pic_url: string | null
	profile_grid_display_type: "default"
}

type APIStatus = "ok" | "fail"

export interface FeedItem {
	taken_at: number
	pk: string
	id: string
	device_timestamp: number
	media_type: number
	code: string
	client_cache_key: string
	filter_type: number
	is_unified_video: boolean
	should_request_ads: boolean
	original_media_has_visual_reply_media: boolean
	caption_is_edited: boolean
	like_and_view_counts_disabled: boolean
	commerciality_status: "not_commercial"
	is_paid_partnership: boolean
	is_visual_reply_commenter_notice_enabled: boolean
	clips_tab_pinned_user_ids: string[]
	has_delayed_metadata: boolean
	comment_likes_enabled: boolean
	comment_threading_enabled: boolean
	max_num_visible_preview_comments: number
	has_more_comments: boolean
	photo_of_you: boolean
	is_organic_product_tagging_eligible: boolean
	can_see_insights_as_brand: boolean
	user: GenericUser & {
		has_anonymous_profile_picture: boolean
		fan_club_info: {
			fan_club_id: null
			fan_club_name: null
			is_fan_club_referral_eligible: null
			fan_consideration_page_revamp_eligiblity: null
			is_fan_club_gifting_eligible: null
		}
		transparency_product_enabled: boolean
		is_favorite: boolean
		is_unpublished: boolean
		account_badges: any[]
		latest_reel_media: number
	}
	can_viewer_reshare: boolean
	like_count: number
	has_liked: boolean
	top_likers: any[]
	facepile_top_likers: any[]
	image_versions2: {
		candidates: ImageVersion[]
		additional_candidates?: AdditionalCandidates<ImageVersion>
		scrubber_spritesheet_info_candidates: {
			default: {
				file_size_kb: number
				max_thumbnails_per_sprite: number
				rendered_width: number
				sprite_height: number
				sprite_urls: string[]
				sprite_width: number
				thumbnail_duration: number
				thumbnail_height: number
				thumbnail_width: number
				thumbnails_per_row: number
				total_thumbnail_num_per_sprite: number
				video_length: number
			}
		}
	}
	video_subtitles_confidence: number
	caption: Caption | null
	comment_inform_treatment: {
		should_have_inform_treatment: boolean
		text: string
		url: string | null
		action_type: null
	}
	sharing_friction_info: {
		should_have_sharing_friction: boolean
		bloks_app_url: null
		sharing_friction_payload: null
	}
	is_dash_eligible: number
	video_dash_manifest?: string
	video_codec?: string
	number_of_qualities: number
	video_versions?: VideoVersion[]
	has_audio?: boolean
	video_duration?: number
	can_viewer_save: boolean
	is_in_profile_grid: boolean
	profile_grid_control_enabled: boolean
	view_count: number
	play_count: number
	organic_tracking_token: string
	third_party_downloads_enabled: boolean
	has_shared_to_fb: number
	product_type: "clips"
	show_shop_entrypoint: boolean
	deleted_reason: number
	integrity_review_decision: "pending"
	commerce_integrity_review_decision: null
	music_metadata: null
	is_artist_pick: boolean
	ig_media_sharing_disabled: boolean
	can_view_more_preview_comments?: boolean
	preview_comments?: GenericUser[]
	comments?: {
		pk: string
		user_id: string
		text: string
		type: number
		created_at: number
		created_at_utc: number
		content_type: string
		status: string
		bit_flags: number
		did_report_as_spam: boolean
		share_enabled: boolean
		user: {
			pk: string
			pk_id: string
			username: string
			full_name: string
			is_private: boolean
			is_verified: boolean
			profile_pic_id: string
			profile_pic_url: string
			fbid_v2: string
		}
		is_covered: boolean
		is_ranked_comment: boolean
		media_id: string
		has_liked_comment: boolean
		comment_like_count: number
		private_reply_status: number
		has_translation?: boolean
		parent_comment_id?: string
	}[]
	comment_count: number
	hide_view_all_comment_entrypoint?: boolean
	inline_composer_display_condition?: "impression_trigger"
	clips_metadata?: ClipsMetadata
	media_cropping_info: MediaCroppingInfo
	carousel_media_count?: number
	carousel_media?: {
		id: string
		media_type: number
		image_versions2: {
			candidates: {
				width: number
				height: number
				url: string
			}[]
		}
		original_width: number
		original_height: number
		accessibility_caption?: string
		pk: string
		carousel_parent_id: string
		usertags?: {
			in: {
				user: {
					pk: string
					pk_id: string
					username: string
					full_name: string
					is_private: boolean
					is_verified: boolean
					profile_pic_url: string
					profile_pic_id?: string
				}
				position: number[]
				start_time_in_video_in_sec: any
				duration_in_video_in_sec: any
			}[]
		}
		commerciality_status: string
		sharing_friction_info: {
			should_have_sharing_friction: boolean
			bloks_app_url: any
			sharing_friction_payload: any
		}
		video_versions?: {
			type: number
			width: number
			height: number
			url: string
			id: string
		}[] | null
		video_duration?: number
		is_dash_eligible?: number
		video_dash_manifest?: string
		video_codec?: string
		number_of_qualities?: number
	}[]
	usertags?: {
		in: {
			user: GenericUser
			position: number[]
			start_time_in_video_in_sec: null
			duration_in_video_in_sec: null
		}[]
	}
	coauthor_producers?: {
		pk: string
		pk_id: string
		username: string
		full_name: string
		is_private: boolean
		is_verified: boolean
		profile_pic_id: string
		profile_pic_url: string
	}[]
	coauthor_producer_can_see_organic_insights?: boolean
	location?: {
		pk: string
		short_name: string
		facebook_places_id: string
		external_source: string
		name: string
		address: string
		city: string
		has_viewer_saved: boolean
		lng: number
		lat: number
		is_eligible_for_guides: boolean
	}
	lat?: number
	lng?: number
	accessibility_caption?: string
	original_width?: number
	original_height?: number
	comments_disabled?: boolean
}

export interface PreviewComment {
	pk: string
	user_id: string
	text: string
	type: number
	created_at: number
	created_at_utc: number
	content_type: string
	status: string
	bit_flags: number
	did_report_as_spam: boolean
	share_enabled: boolean
	user: GenericUser & {
		fbid_v2: string
	}
	is_covered: boolean
	is_ranked_comment: boolean
	media_id: string
	has_liked_comment: boolean
	comment_like_count: number
	private_reply_status: number
	has_translation?: boolean
	parent_comment_id?: string
}

export interface ClipsMetadata {
	music_info: null
	original_sound_info: {
		audio_asset_id: string
		music_canonical_id: string | null
		progressive_download_url: string
		duration_in_ms: number
		dash_manifest: string
		ig_artist: GenericUser
		should_mute_audio: boolean
		hide_remixing: boolean
		original_media_id: string
		time_created: number
		original_audio_title: string
		consumption_info: {
			is_bookmarked: boolean
			should_mute_audio_reason: string
			is_trending_in_clips: boolean
			should_mute_audio_reason_type: null
			display_media_id: null
		}
		can_remix_be_shared_to_fb: boolean
		formatted_clips_media_count: null
		allow_creator_to_rename: boolean
		audio_parts: any[]
		is_explicit: boolean
		original_audio_subtype: "default"
		is_audio_automatically_attributed: boolean
		is_reuse_disabled: boolean
		is_xpost_from_fb: boolean
		xpost_fb_creator_info: null
		nft_info: null
	}
	audio_type: "original_sounds"
	music_canonical_id: string
	featured_label: null
	mashup_info: {
		mashups_allowed: boolean
		can_toggle_mashups_allowed: boolean
		has_been_mashed_up: boolean
		formatted_mashups_count: null
		original_media: null
		privacy_filtered_mashups_media_count: null
		non_privacy_filtered_mashups_media_count: null
		mashup_type: null
		is_creator_requesting_mashup: boolean
		has_nonmimicable_additional_audio: boolean
	}
	nux_info: null
	viewer_interaction_settings: null
	branded_content_tag_info: {
		can_add_tag: boolean
	}
	shopping_info: null
	additional_audio_info: {
		additional_audio_username: null
		audio_reattribution_info: {
			should_allow_restore: boolean
		}
	}
	is_shared_to_fb: boolean
	breaking_content_info: null
	challenge_info: null
	reels_on_the_rise_info: null
	breaking_creator_info: null
	asset_recommendation_info: null
	contextual_highlight_info: null
	clips_creation_entry_point: "feed"
	audio_ranking_info: {
		best_audio_cluster_id: string
	}
	template_info: null
	is_fan_club_promo_video: boolean
	disable_use_in_clips_client_cache: boolean
	content_appreciation_info: {
		enabled: boolean
	}
	achievements_info: {
		show_achievements: boolean
		num_earned_achievements: null
	}
	show_achievements: boolean
	show_tips: boolean
	merchandising_pill_info: null
	is_public_chat_welcome_video: boolean
	professional_clips_upsell_type: number
}

export interface MediaCroppingInfo {
	square_crop: {
		crop_left: number
		crop_right: number
		crop_top: number
		crop_bottom: number
	}
}

export interface Caption {
	pk: string
	user_id: string
	text: string
	type: number
	created_at: number
	created_at_utc: number
	content_type: string
	status: string
	bit_flags: number
	did_report_as_spam: boolean
	share_enabled: boolean
	user: GenericUser & {
		fbid_v2: string
	}
	is_covered: boolean
	is_ranked_comment: boolean
	media_id: string
	has_translation?: boolean
	private_reply_status: number
}

export interface Reel {
	id: `${number}`
	expiring_at: number
	has_pride_media: boolean
	latest_reel_media: number
	seen: number | null
	user: ReelUser
	owner: ReelOwner
	__typename: "GraphReel"
}

export interface ReelChainNode {
	id: `${number}`
	blocked_by_viewer: boolean
	restricted_by_viewer: boolean
	followed_by_viewer: boolean
	follows_viewer: boolean
	full_name: string
	has_blocked_viewer: boolean
	has_requested_viewer: boolean
	is_private: boolean
	is_verified: boolean
	profile_pic_url: string
	requested_by_viewer: boolean
	username: string
}

export interface ReelUser extends Pick<Partial<HighlightUser>, "pk" | "is_private" | "interop_messaging_user_fbid"> {
	id: string | null
	profile_pic_url: string | null
	username: string | null
}

export interface ReelOwner extends ReelUser {
	__typename: "GraphUser"
}

export interface QueryHighlightsAPIResponse {
	data: {
		highlights: {
			edges: {
				node: {
					id: HighlightId
					title: "pictures"
					cover_media: {
						cropped_image_version: {
							url: string
						}
					}
					user: {
						username: string
						id: string | null
					}
					__typename: "XDTReelDict"
				}
				cursor: string
			}[]
			page_info: {
				end_cursor: string
				has_previous_page: boolean
				has_next_page: boolean
			}
		}
	}
	extensions: {
		is_final: boolean
	}
	status: APIStatus
}

export interface GraphTimelineMedia {
	pk: string
	id: string
	code: string
	ad_id: null
	boosted_status: null
	boost_unavailable_identifier: null
	boost_unavailable_reason: null
	caption: Caption | null
	caption_is_edited: boolean
	feed_demotion_control: null
	feed_recs_demotion_control: null
	taken_at: number
	inventory_source: null
	video_versions?: VideoVersion[]
	is_dash_eligible: number
	number_of_qualities: number
	video_dash_manifest?: string
	image_versions2: FeedItem["image_versions2"]
	sharing_friction_info: FeedItem["sharing_friction_info"]
	is_paid_partnership: boolean
	sponsor_tags: null
	affiliate_info: null
	original_height?: number
	original_width?: number
	organic_tracking_token: string
	story_cta: null
	link: null
	user: FeedItem["user"]
	group: null
	owner: {
		pk: string
		id: string
		profile_pic_url: string
		username: string
		friendship_status: {
			is_feed_favorite: boolean
			following: boolean
			is_restricted: boolean
			is_bestie: boolean
		}
		is_embeds_disabled: boolean
		is_unpublished: boolean
		is_verified: boolean
		show_account_transparency_details: boolean
		supervision_info: null
		transparency_product: null
		transparency_product_enabled: boolean
		transparency_label: null
		ai_agent_owner_username: null
		is_private: boolean
		__typename: string
	}
	coauthor_producers?: FeedItem["coauthor_producers"]
	invited_coauthor_producers: any[]
	follow_hashtag_info: null
	title: null
	comment_count: number
	comments_disabled?: FeedItem["comments_disabled"]
	commenting_disabled_for_viewer: null
	like_and_view_counts_disabled: boolean
	has_liked: boolean
	top_likers: any[]
	facepile_top_likers: any[]
	like_count: number
	preview: null
	can_see_insights_as_brand: boolean
	social_context: null
	view_count?: number
	can_reshare: null
	can_viewer_reshare: boolean
	ig_media_sharing_disabled: boolean
	photo_of_you?: boolean
	product_type: FeedItem["product_type"]
	usertags?: FeedItem["usertags"]
	media_overlay_info: null
	carousel_parent_id: null
	carousel_media_count?: FeedItem["carousel_media_count"]
	carousel_media?: FeedItem["carousel_media"]
	location?: FeedItem["location"]
	has_audio?: boolean
	clips_metadata: FeedItem["clips_metadata"]
	clips_attribution_info: null
	wearable_attribution_info: null
	accessibility_caption?: string | null
	audience: null
	display_uri: null
	media_cropping_info?: FeedItem["media_cropping_info"]
	profile_grid_thumbnail_fitting_style: string
	thumbnails: null
	timeline_pinned_user_ids: string[]
	upcoming_event: null
	logging_info_token: null
	explore: null
	main_feed_carousel_starting_media_id: null
	is_seen: null
	open_carousel_submission_state: null
	previous_submitter: null
	all_previous_submitters: null
	headline: null
	comments?: FeedItem["comments"]
	hidden_likes_string_variant: number
	fb_like_count: null
	crosspost_metadata: {
		is_feedback_aggregated: null
	}
	saved_collection_ids: null
	has_viewer_saved?: boolean
	__typename: string
}

export interface QueryTimelineAPIResponse {
	data: {
		xdt_api__v1__feed__user_timeline_graphql_connection: {
			page_info: {
				start_cursor: string | null
				end_cursor: string
				has_previous_page: boolean
				has_next_page: boolean
			}
			edges: {
				node: GraphTimelineMedia
				cursor: string
			}[]
		}
		xdt_viewer: {
			user: {
				id: string
			}
		}
	}
	extensions: {
		is_final: boolean
		all_video_dash_prefetch_representations: {
			video_id: string
			representations: {
				base_url: string
				bandwidth: number
				width: number
				height: number
				mime_type: string
				codecs: string
				playback_resolution_mos: string
				playback_resolution_csvqm: string | null
				segments: {
					start: number
					end: number
				}[]
				representation_id: string
			}[]
			initial_representation_ids: string[]
		}[]
		server_metadata: {
			request_start_time_ms: number
			time_at_flush_ms: number
		}
	}
	status: APIStatus
}

export interface QueryUserAPIResponse {
	data?: {
		user: {
			biography: string
			bio_links: any[]
			biography_with_entities: {
				entities: (null | {
					hashtag: null
					user: {
						username: string
						id: string
					}
				})[]
			}
			external_url: string
			external_lynx_url: null
			full_name: string
			id: string
			friendship_status: {
				following: boolean
				blocking: boolean
				is_feed_favorite: boolean
				outgoing_request: boolean
				followed_by: boolean
				incoming_request: boolean
				is_restricted: boolean
				is_bestie: boolean
				muting: boolean
				is_muting_reel: boolean
			}
			gating: null
			is_memorialized: boolean
			is_private: boolean
			is_verified: boolean
			has_story_archive: null
			username: string
			supervision_info: null
			is_regulated_c18: boolean
			regulated_news_in_locations: any[]
			text_post_app_badge_label: null
			show_text_post_app_badge: null
			eligible_for_text_app_activation_badge: boolean
			hide_text_app_activation_badge_on_text_app: null
			pk: string
			live_broadcast_visibility: null
			live_broadcast_id: null
			profile_pic_url: string
			hd_profile_pic_url_info: {
				url: string
			}
			is_unpublished: false
			mutual_followers_count: number
			profile_context_links_with_user_ids: {
				username: string
				id: string | null
			}[]
			account_badges: []
			ai_agent_type: null
			has_chaining: true
			fbid_v2: string
			interop_messaging_user_fbid: string
			account_type: number
			is_embeds_disabled: boolean
			show_account_transparency_details: boolean
			is_professional_account: null
			follower_count: number
			address_street: null
			city_name: null
			is_business: boolean
			zip: null
			category: null
			should_show_category: null
			pronouns: string[]
			transparency_label: null
			transparency_product: null
			following_count: number
			media_count: number
			latest_reel_media: number | null
			total_clips_count: number | null
			latest_besties_reel_media: number | null
			reel_media_seen_timestamp: number | null
		}
		viewer: {
			user: {
				pk: string
				id: string
				can_see_organic_insights: boolean
				has_onboarded_to_text_post_app: boolean
			}
		}
	}
	extensions: {
		is_final: boolean
	}
}

export interface FacebookAccountAPIResponse {
	fbAccount: {
		obfuscated_account_id: string
		profile_pic_url: string
		display_name: string
		sso_login_available: boolean
		is_sso_enabled: boolean
	}
	status: APIStatus
	message?: string
}

export type ReplyTypes = "story_selfie_reply" | "story_remix_reply"

export type HighlightId = `highlight:${number}`
export type StoryId = `${number}`

export interface HighlightCoverMedia {
	cropped_image_version: ImageVersion & {
		scans_profile: string
	}
	crop_rect: [number, number, number, number]
	media_id: string
	full_image_version: any
	upload_id: any
}

export interface HighlightUser extends Omit<GenericUser, "profile_grid_display_type" | "profile_pic_id" | "full_name" | "pk_id"> {
	interop_messaging_user_fbid: number | null
	friendship_status?: null
}

interface ReelMedia<T extends string = HighlightId> {
	id: T
	strong_id__: T
	latest_reel_media: number
	seen: boolean | null
	can_reply: boolean
	can_gif_quick_reply: boolean
	can_reshare: boolean
	can_react_with_avatar: boolean
	reel_type: "highlight_reel"
	ad_expiry_timestamp_in_millis: any
	is_cta_sticker_available: any
	app_sticker_info: any
	should_treat_link_sticker_as_cta: any
	cover_media: HighlightCoverMedia[]
	user: HighlightUser[]
	items: FeedItem[]
	title: string
	created_at: number
	is_pinned_highlight: boolean
	prefetch_count: number
	media_count: number
	media_ids: string[]
	is_cacheable: boolean
	is_converted_to_clips: boolean
	disabled_reply_types: ReplyTypes[]
	highlight_reel_type: string
}

interface GraphReelsMedia {
	preview: null
	product_type: "story"
	reshared_story_media_author: null
	sharing_friction_info: {
		bloks_app_url: null
		should_have_sharing_friction: boolean
	}
	sponsor_tags: null
	story_app_attribution: null
	story_bloks_stickers: null
	story_countdowns: null
	story_cta: null
	story_feed_media: null
	story_hashtags: null
	story_link_stickers: null
	story_locations: null
	story_music_stickers: null
	story_questions: null
	story_sliders: null
	taken_at: number
	text_post_share_to_ig_story_stickers: null
	video_dash_manifest: null
	video_duration: null
	video_versions: null
	viewer_count: null
	viewers: null
	visual_comment_reply_sticker_info: null
	accessibility_caption: string
	audience: null | "besties"
	boost_unavailable_identifier: null
	boost_unavailable_reason: null
	boosted_status: null
	can_see_insights_as_brand: boolean
	can_viewer_reshare: null
	carousel_media: null
	carousel_media_count: null
	expiring_at: number
	has_audio: null
	has_liked: boolean
	has_translation: boolean
	ig_media_sharing_disabled: boolean
	inventory_source: null
	is_dash_eligible: null
	is_paid_partnership: boolean
	media_overlay_info: null
	media_type: number
	number_of_qualities: null
	organic_tracking_token: string
	original_height: number
	original_width: number
	pk: `${number}`
	user: ReelUser
	image_versions2: {
		candidates: ImageVersion[]
	}
}

export interface GraphHighlightsMedia extends GraphReelsMedia {
	id: string
	can_reply: boolean
	can_reshare: boolean
	__typename: "XDTMediaDict"
}

export interface GraphReelUser {
	id: null | string
	pk: `${number}`
	profile_pic_url: null | string
	username: null | string
	is_private: false
}

export interface HighlightsAPIResponse {
	data: {
		xdt_api__v1__feed__reels_media__connection: {
			edges: [{
				node: {
					id: HighlightId
					items: GraphHighlightsMedia[]
					user: HighlightUser
					reel_type: "highlight_reel"
					cover_media: {
						cropped_image_version: {
							url: string
						}
						full_image_version: string | null
					}
					title: string
					seen: number | null
					__typename: "XDTReelDict"
				}
				cursor: string
			}]
			page_info: {
				start_cursor: HighlightId
				end_cursor: HighlightId
				has_next_page: boolean
				has_previous_page: boolean
			}
		}
	}
	extensions: {
		is_final: boolean
	}
	status: APIStatus
}

export interface StoriesAPIResponse {
	reels: {
		[storyId: StoryId]: ReelMedia<StoryId>
	}
	reels_media?: ReelMedia<StoryId>[]
	status: APIStatus
}

export interface GraphAPIResponseError {
	errors: {
		message: string
		severity: string
		extensions: any
	}[]
	data: null
	status: "ok"
}
