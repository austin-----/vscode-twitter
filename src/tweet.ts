var XRegExp = require('xregexp').XRegExp;
var moment = require('moment');

export default class Tweet {
	text: string;
	userName: string;
	userScreenName: string;
	userImage: string;
	created: string;
	quoted: Tweet;
	media: any[];
	
	static lineFeed: string = '\r\n\r\n';
	static endLine: string = '_____' + Tweet.lineFeed;
	static quote: string = '>';
	
	toMarkdown(level: number = 0) : string {
		const quote = new Array(level + 1).join(Tweet.quote);
		var result = quote + this.formatUser(level) + Tweet.lineFeed + 
			quote + Tweet.normalize(this.text) + Tweet.lineFeed;
		if (this.quoted) {
			result += this.quoted.toMarkdown(level + 1);
		}
		if (level == 0) {
			if (this.media) {
				this.media.forEach((value, index, array) => {
					result += '![](' + value.media_url_https + ')' + Tweet.lineFeed;
				});
			}
		}
		if (level == 0) result += Tweet.endLine;
		return result;
	}
	
	constructor(created: string, text: string, userName: string, userScreenName: string, userImage: string) {
		this.created = created;
		this.text = text;
		this.userName = userName;
		this.userScreenName = userScreenName;
		this.userImage = userImage;
	}
	
	formatUser(level: number) : string {
		var result = ''
		if (level == 0) {
			result += '![](' + this.userImage + ') ';
		}
		result += Tweet.bold(this.userName) + ' [@' + this.userScreenName + ']()';
		if (level == 0) {
			result += ' \u2022 ' + moment(this.created.replace(/( +)/, ' UTC$1')).fromNow();
		}
		return result;
	}
	
	static bold(text: string) : string {
		return '**' + text + '**';
	}
	
	static head1(text: string) : string {
		return '#' + text + '\r\n\r\n';
	}
	
	static normalize(text: string) : string {
		var hashtag = new XRegExp('(#\\pL+)');
		var user = new XRegExp('(@\\pL+)');
		return text.replace(hashtag, '[$1]()').replace(user, '[$1]()');
	}
	
	static fromJson(json: any) : Tweet {
		var tweet = new Tweet (json.created_at, json.text, json.user.name, json.user.screen_name, json.user.profile_image_url_https);
		if (json.quoted_status) {
			tweet.quoted = Tweet.fromJson(json.quoted_status);
		}
		if (json.entities.media) {
			tweet.media = json.entities.media;
		}
		return tweet;
	}
}