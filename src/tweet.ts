var XRegExp = require('xregexp').XRegExp;
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
	
	hashTagLink(hashtag: string): string {
		return this.hashTagLinkPrefix() + hashtag;
	}
	
	toMarkdown(level: number = 0) : string {
		const quote = new Array(level + 1).join(Tweet.quote);
		var result = quote + this.formatUser(level) + Tweet.lineFeed + 
			quote + this.normalize(this.text) + Tweet.lineFeed;
		if (this.quoted) {
			result += this.quoted.toMarkdown(level + 1);
		}
		
		if (this.media) {
			var size = (level == 0) ? ':small' : ':thumb';
			this.media.forEach((value, index, array) => {
				result += quote + '[![](' + value.media_url_https + size + ')](' + value.media_url_https + ':large)' + Tweet.lineFeed;
			});
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
		result += ' [(Detail)](' + this.tweetLink() + ')'; 
		return result;
	}
	
	static bold(text: string) : string {
		return '**' + text + '**';
	}
	
	static head1(text: string) : string {
		return '#' + text + '\r\n\r\n';
	}
	
	normalize(text: string) : string {
		var hashtag = new XRegExp('#([\\pL\\d_]+)', 'g');
		var user = new XRegExp('@([\\pL\\d_]+)', 'g');
		var rt = new XRegExp('^RT ', 'g');
		return text.replace(hashtag, '[#$1](' + this.hashTagLinkPrefix() + '$1)').replace(user, '[@$1](' + this.userLinkPrefix() + '$1)').replace('_', '\uFF3F').replace(rt, '**RT** ');
	}
	
	static fromJson(json: any) : Tweet {
		var tweet = new Tweet (json.id_str, json.created_at, json.text, json.user.id_str, json.user.name, json.user.screen_name, json.user.profile_image_url_https);
		if (json.quoted_status) {
			tweet.quoted = Tweet.fromJson(json.quoted_status);
		}
		var entities = json.entities;
		if (json.extended_entities) {
			entities = json.extended_entities;
		}
		if (entities.media) {
			tweet.media = entities.media;
		}
		return tweet;
	}
}