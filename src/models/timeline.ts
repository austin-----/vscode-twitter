import * as vscode from 'vscode';
import Tweet from '../models/tweet';
import User from '../models/user';
import TwitterClient from '../twitter';
import HTMLFormatter from './html';
import {UserFormatPosition} from './html';

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
    getNew: boolean;
    getHTML(): Thenable<string>;
}

export class TimelineFactory {

    static otherUserTimelineList: Array<OtherUserTimeline> = [];
    static searchTimelineList: Array<SearchTimeline> = [];

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
                    timeline = this.otherUserTimelineList.find((v, i, a) => { return v.query == param; });
                    if (timeline == null)
                    {
                        console.log('create new other user timeline for ' + param);
                        timeline = new OtherUserTimeline(param);
                        this.otherUserTimelineList.push(timeline as OtherUserTimeline);
                        if (this.otherUserTimelineList.length >= 20) {
                            this.otherUserTimelineList.shift();
                        }
                    }
                }
                break;
            case TimelineType.Search:
                if (param != null) {
                    timeline = this.searchTimelineList.find((v, i, a) => { return v.query == param; });
                    if (timeline == null)
                    {
                        console.log('create new search timeline for ' + param);
                        timeline = new SearchTimeline(param);
                        this.searchTimelineList.push(timeline as SearchTimeline);
                        if (this.searchTimelineList.length >= 20) {
                            this.searchTimelineList.shift();
                        }
                    }
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

    sinceId: string;
    maxId: string;
    tweets: Tweet[];

    params: any = { count: 100 };
    endpoint: string = '';

    title: string;
    getNew: boolean = true;

    getTweets(): Thenable<string> {
        console.log('getTweets: ' + this.getNew);
        const self = this;
        var params: any = Object.assign({}, this.params);
        if (this.sinceId && this.getNew) {
            params.since_id = this.sinceId;
        }

        if (this.maxId && !this.getNew) {
            params.max_id = this.maxId;
        }

        return new Promise((resolve, reject) => {
            TwitterClient.get(self.endpoint, params).then((tweets: any) => {
                if (!(tweets instanceof Array)) {
                    tweets = tweets.statuses;
                };

                if (this.getNew) {
                    tweets = tweets.reverse();
                } else {
                    // older tweet has a duplicate entry
                    tweets.shift();
                }

                tweets.forEach((value, index, array) => {
                    if (this.getNew) {
                        // don't cache more than 1000 tweets
                        if (self.tweets.unshift(Tweet.fromJson(value)) >= 1000) {
                            self.tweets.pop();
                        }
                        while (self.tweets.length > 1000) {
                            self.tweets.pop();
                        }
                    } else {
                        // don't remove newer tweets
                        self.tweets.push(Tweet.fromJson(value));
                    }
                });

                self.maxId = self.tweets[self.tweets.length - 1].id;
                self.sinceId = self.tweets[0].id;
                var result = HTMLFormatter.formatTweets(self.tweets);
                resolve(result);
            }, (error) => {
                reject(error);
            });
        });
    }

    getHTML(): Thenable<string> {
        return new Promise((resolve, reject) => {
            const self = this;
            this.getTweets().then((value) => {
                var result = HTMLFormatter.formatTimeline(self.title, self.type, self.query, '', value);
                resolve(result);
            }, (error) => { reject(error); });
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
    profileEndPoint = 'account/verify_credentials';
    
    constructor() {
        super();
        this.type = TimelineType.User;
        this.endpoint = 'statuses/user_timeline';
        this.title = 'User Timeline';
    }

    protected static createInstance(): Timeline {
        return new UserTimeline();
    }
    
    getHTML(): Thenable<string> {
        return new Promise((resolve, reject) => {
            const self = this;
            this.getTweets().then((value) => {
                TwitterClient.get(self.profileEndPoint, { include_entities: true }).then((user) => {
                    var userProfile = User.fromJson(user);
                    var description = HTMLFormatter.formatUser(userProfile, UserFormatPosition.Profile);
                    var result = HTMLFormatter.formatTimeline(self.title, self.type, self.query, description, value);
                    resolve(result);
                }, (error) => { reject(error); });
            }, (error) => { reject(error); });
        });
    }
}

class OtherUserTimeline extends BaseTimeline {

    profileEndPoint = 'users/show';

    constructor(screenName: string) {
        super();
        this.type = TimelineType.OtherUser;
        this.endpoint = 'statuses/user_timeline';
        this.title = 'User: @' + screenName;
        this.query = screenName;
        this.params.screen_name = screenName;
    }

    getHTML(): Thenable<string> {
        return new Promise((resolve, reject) => {
            const self = this;
            console.log('OtherUsertimeline: getNew ' + this.getNew);
            this.getTweets().then((value) => {
                TwitterClient.get(self.profileEndPoint, { screen_name: self.query, include_entities: true }).then((user) => {
                    var userProfile = User.fromJson(user);
                    var description = HTMLFormatter.formatUser(userProfile, UserFormatPosition.Profile);
                    var result = HTMLFormatter.formatTimeline(self.title, self.type, self.query, description, value);
                    resolve(result);
                }, (error) => { reject(error); });
            }, (error) => { reject(error); });
        });
    }
}

class SearchTimeline extends BaseTimeline {

    searchEndPoint = 'search/tweets';
    keyword: string;

    constructor(keyword: string) {
        super();
        this.type = TimelineType.Search;
        this.endpoint = 'statuses/lookup';
        this.title = 'Search results: ' + keyword;
        this.query = keyword;
        this.keyword = keyword;
    }

    parentGetNew(): Thenable<string> {
        return super.getTweets();
    }

    getTweets(): Thenable<string> {
        const self = this;

        var params = Object.assign({}, this.params);
        if (this.sinceId && this.getNew) {
            params.since_id = this.sinceId;
        }
        if (this.maxId && !this.getNew) {
            params.max_id = this.maxId;
        }

        params.q = this.keyword;
        params.include_entities = false;

        return new Promise((resolve, reject) => {
            TwitterClient.get(self.searchEndPoint, params).then((tweets: any) => {
                if (!(tweets instanceof Array)) {
                    tweets = tweets.statuses;
                };
                self.params.id = (<any[]>tweets).map<string>((value, index, array): string => { return value.id_str; }).join(',');
                console.log('Search results: ' + self.params.id);
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