var moment = require('moment');
import * as punycode from 'punycode';

enum EntityType {
	UserMention = 1,
	HashTag,
	Symbol,
	Url
}

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
	urls: any[];
	retweeted: Tweet;
	
	static lineFeed: string = '\r\n\r\n';
	static endLine: string = '_____' + Tweet.lineFeed;
	static quote: string = '>';	
	static dotSeparator: string = ' \u2022 ';
	static retweetSymbol: string = '\u267A';
	static underscoreAlter: string = '&lowbar;';
	static autoplayControl = ' autoplay loop ';
	static videoControl = ' muted controls preload="none" ';

	static serviceUrl = 'http://localhost:3456/';
	static get userLinkPrefix(): string {
		//return 'https://twitter.com/';
		return this.serviceUrl + 'user/';
	} 
	static get hashTagLinkPrefix(): string {
		//return 'https://twitter.com/hashtag/';
		return this.serviceUrl + 'search/%23';
	}
	
	static get searchPrefix(): string {
		//return 'https://twitter.com/search?q=';
		return this.serviceUrl + 'search/';
	}
	
	static get imagePrefix(): string {
		return this.serviceUrl + 'image/';
	}
	
	tweetLink(): string {
		return 'https://twitter.com/' + this.userScreenName + '/status/' + this.id;
	}
	
	userLink(): string {
		return Tweet.userLinkPrefix + this.userScreenName;
	}
	
	toMarkdown(level: number = 0) : string {
		const quote = Tweet.quote.repeat(level);
		
		if (this.retweeted) {
			return this.formatUser(-1) + ' ' + 'Retweeted' + Tweet.lineFeed + this.retweeted.toMarkdown(level);
		}
		
		var result = quote + this.formatUser(level) + Tweet.lineFeed + 
			quote + this.normalizeText(quote) + Tweet.lineFeed;
		if (this.quoted) {
			result += this.quoted.toMarkdown(level + 1);
		}
		
		if (this.media) {
			const size = (level == 0) ? ':small' : ':thumb';
			var mediaStr = this.media.map<string>((value, index, array): string => {
				var mediaStr = '';
				if (value.type == 'video' || value.type == 'animated_gif') {
					const control = ((value.type == 'animated_gif') ? Tweet.autoplayControl : Tweet.videoControl);
					const variants: any[] = value.video_info.variants;
					if (variants.length != 0) {
						mediaStr += '<video width="340" poster="' + value.media_url_https + '" ' + control + '>';
						variants.forEach((video, index, array) => {
							mediaStr += '<source src="' + video.url + '" type="' + video.content_type + '"/>';
						});
						mediaStr += '</video>';
						return mediaStr;
					}
				}
				// not video, use image
				//return '[![](' + value.media_url_https + size + ')](' + value.media_url_https + ':large)';
				return this.createLink('![](' + value.media_url_https + size + ')', Tweet.imagePrefix + encodeURIComponent(value.media_url_https + ':large'));
			}).join(' ');
			if (mediaStr != '') {
				result += quote + mediaStr + Tweet.lineFeed;
			}
		}
		if (level == 0) result += Tweet.endLine;
		return result;
	}
	
	formatUser(level: number) : string {
		var result = ''
		if (level == 0) {
			result += '![](' + this.userImage + ') ';
		}
		if (level == -1) {
			result += Tweet.retweetSymbol + ' ' + this.createLink(this.userName, this.userLink());
		} else {
			result += Tweet.bold(this.userName) + ' ' + this.createLink(Tweet.normalizeUnderscore('@' + this.userScreenName), this.userLink());
		}
		
		if (level == 0) {
			result += Tweet.dotSeparator + moment(this.created.replace(/( +)/, ' UTC$1')).fromNow();
		}
		if (level != -1) {
			result += ' ([Detail](' + this.tweetLink() + ')) ';
		}
		return result;
	}
	
	createLink(text: string, url: string): string {
		//return '[' + text + '](' + url + ')';
		return '<a onclick="xhttp=new XMLHttpRequest();xhttp.open(\'GET\', \'' + url + '\', true);xhttp.send();" >' + text + '</a>';
	}
	
	normalizeText(quote: string): string {
		var normalized:number[] = <any>punycode.ucs2.decode(this.text);
		
		var indexArray:any[] = [];
		
		// user mentions
		if (this.userMentions) {	
			indexArray = indexArray.concat(this.userMentions.map(u => { return {type: EntityType.UserMention, i0: u.indices[0], i1:u.indices[1], tag: u}; }));
		}
		
		if (this.hashTags) {
			indexArray = indexArray.concat(this.hashTags.map(u => { return {type: EntityType.HashTag, i0: u.indices[0], i1:u.indices[1], tag: u}; }));
		}
		
		if (this.symbols) {
			indexArray = indexArray.concat(this.symbols.map(u => { return {type: EntityType.Symbol, i0: u.indices[0], i1:u.indices[1], tag: u}; }));
		}
		
		if (this.urls) {
			indexArray = indexArray.concat(this.urls.map(u => { return {type: EntityType.Url, i0: u.indices[0], i1:u.indices[1], tag: u}; }));
		}
		
		indexArray.sort((a, b) => { return a.i0 - b.i0; });
		
		var processed = '';
		var last = 0;
		indexArray.forEach((value, index, array) => {
			processed += punycode.ucs2.encode(normalized.slice(last, value.i0));
			var token = punycode.ucs2.encode(normalized.slice(value.i0, value.i1));
			switch(value.type) {
				case EntityType.UserMention:
					token = this.createLink(Tweet.normalizeUnderscore(token), Tweet.userLinkPrefix + value.tag.screen_name);
					break;
				case EntityType.HashTag:
					token = this.createLink(Tweet.normalizeUnderscore(token), Tweet.hashTagLinkPrefix + value.tag.text);
					break;
				case EntityType.Symbol:
					token = this.createLink(token, Tweet.searchPrefix + '$' + value.tag.text);
					break;
				case EntityType.Url:
					token = this.createLink(token, value.tag.url);
					break;
			}
			processed += token;
			last = value.i1;
		});
		
		processed += punycode.ucs2.encode(normalized.slice(last));
		var result = processed;
		result = result.replace(/_/g, Tweet.underscoreAlter);
		result = result.replace(/^RT /, Tweet.bold('RT') + ' ');
		result = result.replace(/\n/g, '\n' + quote)
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
	
	static normalizeUnderscore(text: string): string {
		return text.replace(/_/g, Tweet.underscoreAlter);
	}
	
	static bold(text: string) : string {
		return '**' + text + '**';
	}
	
	static head1(text: string) : string {
		return '#' + text + '\r\n\r\n';
	}
	
	static fromJson(json: any) : Tweet {
		var tweet = new Tweet (json.id_str, json.created_at, json.text, json.user.id_str, json.user.name, json.user.screen_name, json.user.profile_image_url_https);
		if (json.quoted_status) {
			tweet.quoted = Tweet.fromJson(json.quoted_status);
		}
		
		if (json.retweeted_status) {
			tweet.retweeted = Tweet.fromJson(json.retweeted_status);
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
		if (entities.urls) {
			tweet.urls = entities.urls;
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