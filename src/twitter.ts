import * as vscode from 'vscode'
import * as os from 'os'
import * as fs from 'fs'
import {join} from 'path';
import Tweet from './tweet'

var Twitter = require('twitter');

function rndName() {
	return Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 10);
}

export const Signature: string = '[](VSCODE_TWITTER_SIGNATURE)';

export enum TimelineType {
	Home = 1,
	User,
	Search
}

export class TimelineFactory {
	static getTimeline(type: TimelineType): Timeline {
		switch (type) {
			case TimelineType.Home:
				return HomeTimeline.getSharedInstance();
				break;
			case TimelineType.User:
				return UserTimeline.getSharedInstance();
				break;
			default:
				return HomeTimeline.getSharedInstance();
				break;
		}
	}
	
	static docs: any = {};
	
	static getSearchTimeline(keyword: string): Timeline {
		return new SearchTimeline(keyword);
	}
}

export interface Timeline {
	getNew(): Thenable<string>;
	post(status: string): Thenable<string>;
	filename: vscode.Uri;
}

abstract class BaseTimeline implements Timeline {
	client: any;
	
	protected _filename: string;
	get filename(): vscode.Uri {
		return vscode.Uri.parse('untitled:' + this._filename);
	}
	since_id: string;
	timeline: Tweet[];

	params: any = { count: 100 };
	endpoint: string = '';
	
	title: string;

	getNew(): Thenable<string> {
		const self = this;
		var params: any = this.params;
		if (this.since_id) {
			params.since_id = this.since_id;
		}
		return new Promise((resolve, reject) => {
			self.client.get(self.endpoint, params, function(error: any[], tweets: any, resposne) {
				if (!error) {
					if (!(tweets instanceof Array)) {
						tweets = tweets.statuses;
					}
					console.log(tweets);
					var first = true;
					tweets.forEach((value, index, array) => {
						if (first) {
							first = false;
							self.since_id = value.id_str;
						}
						// don't cache more than 1000 tweets
						if (self.timeline.push(Tweet.fromJson(value)) >= 1000) {
							self.timeline.shift();
						}
					});
					const result = Tweet.head1(Signature + self.title) + self.timeline.map<string>((t) => { return t.toMarkdown(); }).join('');
					resolve(result);
				} else {
					console.log(error);
					var msg = error.map((value, index, array) => { return value.message; }).join(';');
					reject(msg);
				}
			});
		});
	}

	post(status: string): Thenable<string> {
		const self = this;
		return new Promise((resolve, reject) => {
			self.client.post('statuses/update', { status: status }, function(error, data, response) {
				if (!error) {
					console.log(data);
					resolve('OK');
				} else {
					console.log(error);
					var msg = error.map((value, index, array) => { return value.message; }).join(';');
					reject(msg);
				}
			});
		});
	}

	protected static _instance: Timeline;
	protected static createInstance(): Timeline {
		throw new Error('Shouldn\'t be called');
	}

	static getSharedInstance(): Timeline {
		if (!this._instance) {
			this._instance = this.createInstance();
		}
		return this._instance;
	}

	constructor() {
		var configuration = vscode.workspace.getConfiguration('twitter');
		var consumer_key = configuration.get('consumerkey');
		var consumer_secret = configuration.get('consumersecret');
		var access_token_key = configuration.get('accesstokenkey');
		var access_token_secret = configuration.get('accesstokensecret');
		this.client = new Twitter({
			consumer_key,
			consumer_secret,
			access_token_key,
			access_token_secret
		});
		this._filename = rndName() + '.md';
		this.timeline = new Array<Tweet>();
	}
}

class HomeTimeline extends BaseTimeline {
	constructor() {
		super();
		this.endpoint = 'statuses/home_timeline';
		this._filename = 'Twitter_HomeTimeline_' + this._filename;
		this.title = 'Home Timeline';
	}

	protected static createInstance(): Timeline {
		return new HomeTimeline();
	}
}

class UserTimeline extends BaseTimeline {
	constructor() {
		super();
		this.endpoint = 'statuses/user_timeline';
		this._filename = 'Twitter_UserTimeline_' + this._filename;
		this.title = 'User Timeline';
	}

	protected static createInstance(): Timeline {
		return new UserTimeline();
	}
}

class SearchTimeline extends BaseTimeline {
	
	constructor(keyword: string) {
		super();
		this.endpoint = 'search/tweets';
		this._filename = 'Twitter_Search_' + encodeURIComponent(keyword) + '_' + this._filename;
		this.title = 'Search for ' + keyword;
		this.params.q = keyword;
	}
}