var moment = require('moment');

export default class Tweet {
	id: string;
	text: string;
	userId: string;
	userName: string;
	userScreenName: string;
	userImage: string;
	created: string;
	quoted: Tweet;
	media: any[];
	userMentions: any[];
	hashTags: any[];
	symbols: any[];
	
	static lineFeed: string = '\r\n\r\n';
	static endLine: string = '_____' + Tweet.lineFeed;
	static quote: string = '>';
	
	tweetLink(): string {
		return 'https://twitter.com/' + this.userScreenName + '/status/' + this.id;
	}
	
	userLinkPrefix(): string {
		return 'https://twitter.com/';
	}
	
	userLink(): string {
		return this.userLinkPrefix() + this.userScreenName;
	}
	
	hashTagLinkPrefix(): string {
		return 'https://twitter.com/hashtag/';
	}
	
	searchPrefx(): string {
		return 'https://twitter.com/search?q='
	}
	
	hashTagLink(hashtag: string): string {
		return this.hashTagLinkPrefix() + hashtag;
	}
	
	toMarkdown(level: number = 0) : string {
		const quote = new Array(level + 1).join(Tweet.quote);
		var result = quote + this.formatUser(level) + Tweet.lineFeed + 
			quote + this.normalizeText() + Tweet.lineFeed;
		if (this.quoted) {
			result += this.quoted.toMarkdown(level + 1);
		}
		
		if (this.media) {
			const size = (level == 0) ? ':small' : ':thumb';
			var mediaStr = this.media.map<string>((value, index, array): string => {
				var mediaStr = '';
				if (value.type == 'video' || value.type == 'animated_gif') {
					const variants: any[] = value.video_info.variants;
					if (variants.length != 0) {
						mediaStr += '<video width="340" poster="' + value.media_url_https + '" autoplay loop>';
						variants.forEach((video, index, array) => {
							mediaStr += '<source src="' + video.url + '" type="' + video.content_type + '"/>';
						});
						mediaStr += '</video>';
						return mediaStr;
					}
				}
				// not video, use image
				return '[![](' + value.media_url_https + size + ')](' + value.media_url_https + ':large)';
			}).join(' ');
			if (mediaStr != '') {
				result += quote + mediaStr + Tweet.lineFeed;
			}
		}
		if (level == 0) result += Tweet.endLine;
		return result;
	}
	
	constructor(id: string, created: string, text: string, userId: string, userName: string, userScreenName: string, userImage: string) {
		this.id = id;
		this.created = created;
		this.text = text;
		this.userId = userId;
		this.userName = userName;
		this.userScreenName = userScreenName;
		this.userImage = userImage;
	}
	
	formatUser(level: number) : string {
		var result = ''
		if (level == 0) {
			result += '![](' + this.userImage + ') ';
		}
		result += Tweet.bold(this.userName) + ' [@' + this.userScreenName.replace('_', '\uFF3F') + '](' + this.userLink() + ')';
		if (level == 0) {
			result += ' \u2022 ' + moment(this.created.replace(/( +)/, ' UTC$1')).fromNow();
		}
		result += ' ([Detail](' + this.tweetLink() + '))'; 
		return result;
	}
	
	static bold(text: string) : string {
		return '**' + text + '**';
	}
	
	static head1(text: string) : string {
		return '#' + text + '\r\n\r\n';
	}
	
	normalizeText(): string {
		var result = this.text;
		
		// user mentions
		if (this.userMentions) {
			this.userMentions.forEach((value, index, array) => {
				result = result.replace('@' + value.screen_name, '[@' + value.screen_name.replace('_', '\uFF3F') + '](' + this.userLinkPrefix() + value.screen_name + ')');
			});
		}
		
		if (this.hashTags) {
			this.hashTags.forEach((value, index, array) => {
				result = result.replace('#' + value.text, '[#' + value.text + '](' + this.hashTagLinkPrefix() + value.text + ')');
			});
		}
		
		if (this.symbols) {
			this.symbols.forEach((value, index, array) => {
				result = result.replace('$' + value.text, '[$' + value.text + '](' + this.searchPrefx() + '$' + value.text + ')');
			});
		}
		result = result.replace(/^RT '/g, '**RT** ');
		return result;
	}
	
	static fromJson(json: any) : Tweet {
		var tweet = new Tweet (json.id_str, json.created_at, json.text, json.user.id_str, json.user.name, json.user.screen_name, json.user.profile_image_url_https);
		if (json.quoted_status) {
			tweet.quoted = Tweet.fromJson(json.quoted_status);
		}
		
		var entities = json.entities;
		if (entities.user_mentions) {
			tweet.userMentions = entities.user_mentions;
		}
		if (entities.hashtags) {
			tweet.hashTags = entities.hashtags;
		}
		if (entities.symbols) {
			tweet.symbols = entities.symbols;
		}
		
		if (json.extended_entities) {
			entities = json.extended_entities;
		}
		if (entities.media) {
			tweet.media = entities.media;
		}
		return tweet;
	}
}