import * as vscode from 'vscode';
import Tweet from '../models/tweet';
import TwitterClient from '../twitter';
import HTMLFormatter from './html';

export enum TimelineType {
	Home = 1,
	User,
	Mentions,
    OtherUser,
    Search,
    Post,
    Trend,
    Image
}

export interface Timeline {
    getTweets() : Thenable<string>;
    getHTML() : Thenable<string>;
}

export class TimelineFactory {
    static getTimeline(type: TimelineType, param?: string): Timeline {
        var timeline: Timeline = null;
        switch (type) {
            case TimelineType.Home:
                timeline = HomeTimeline.getSharedInstance();
                break;
            case TimelineType.User:
                timeline = UserTimeline.getSharedInstance();
                break;
            case TimelineType.Mentions:
                timeline = MentionsTimeline.getSharedInstance();
                break;
            case TimelineType.OtherUser:
                if (param != null) {
                    timeline = new OtherUserTimeline(param);
                }
                break;
            case TimelineType.Search:
                if (param != null) {
                    timeline = new SearchTimeline(param);
                }
                break;
        }
        return timeline;
    }
}

abstract class BaseTimeline implements Timeline {
	refreshInProgress: boolean = false;
	type: TimelineType;
    query: string;

	since_id: string;
	tweets: Tweet[];

	params: any = { count: 100 };
	endpoint: string = '';

	title: string;

	getTweets(): Thenable<string> {
		const self = this;
		var params: any = this.params;
		if (this.since_id) {
			params.since_id = this.since_id;
		}
		return new Promise((resolve, reject) => {
			TwitterClient.get(self.endpoint, params).then((tweets: any) => {
                if (!(tweets instanceof Array)) {
						tweets = tweets.statuses;
					};
					// older tweets go first
					tweets.reverse().forEach((value, index, array) => {
						self.since_id = value.id_str;
						// don't cache more than 1000 tweets
						if (self.tweets.unshift(Tweet.fromJson(value)) >= 1000) {
							self.tweets.pop();
						}
					});
					var result = HTMLFormatter.formatTweets(self.tweets);
					resolve(result);
            }, (error) => {
                reject(error);
            });
		});
	}
    
    getHTML() : Thenable<string> {
        return new Promise((resolve, reject) => {
            this.getTweets().then((value) => {
                var result = HTMLFormatter.formatTimeline(this.title, this.type, this.query, value);
                resolve(result);
            }, (error) => {reject(error);});
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
		this.tweets = new Array<Tweet>();
	}
}

class HomeTimeline extends BaseTimeline {
	constructor() {
		super();
		this.type = TimelineType.Home;
		this.endpoint = 'statuses/home_timeline';
		this.title = 'Home Timeline';
	}

	protected static createInstance(): Timeline {
		return new HomeTimeline();
	}
}

class MentionsTimeline extends BaseTimeline {
	constructor() {
		super();
		this.type = TimelineType.Mentions;
		this.endpoint = 'statuses/mentions_timeline';
		this.title = 'Mentions Timeline';
	}
	
	protected static createInstance(): Timeline {
		return new MentionsTimeline();
	}
}

class UserTimeline extends BaseTimeline {
	constructor() {
		super();
		this.type = TimelineType.User;
		this.endpoint = 'statuses/user_timeline';
		this.title = 'User Timeline';
	}

	protected static createInstance(): Timeline {
		return new UserTimeline();
	}
}

class OtherUserTimeline extends BaseTimeline {
	constructor(screenName: string) {
		super();
		this.type = TimelineType.OtherUser;
		this.endpoint = 'statuses/user_timeline';
		this.title = 'User: @' + screenName.replace(/_/g, Tweet.underscoreAlter);
        this.query = screenName;
		this.params.screen_name = screenName;
	}
}

class SearchTimeline extends BaseTimeline {

	searchEndPoint = 'search/tweets';
	keyword: string;

	constructor(keyword: string) {
		super();
		this.type = TimelineType.Search;
		this.endpoint = 'statuses/lookup';
		this.title = 'Search results: ' + keyword.replace(/_/g, Tweet.underscoreAlter);
        this.query = keyword;
		this.keyword = keyword;
	}
	
	parentGetNew(): Thenable<string> {
		return super.getTweets();
	}
	
	getTweets(): Thenable<string> {
		const self = this;
		this.params.q = this.keyword;
		this.params.include_entities = false;
		return new Promise((resolve, reject) => {
			TwitterClient.get(self.searchEndPoint, self.params).then((tweets:any) => {
                if (!(tweets instanceof Array)) {
						tweets = tweets.statuses;
					};
					self.params.id = (<any[]>tweets).map<string>((value, index, array):string => { return value.id_str; }).join(',');
					self.params.include_entities = true;
					self.parentGetNew().then(value => {
						resolve(value);
					}, error => {
						reject(error);
					});
            }, (error) => {
                reject(error);
            });
		});
	}
}