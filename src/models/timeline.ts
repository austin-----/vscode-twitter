import Tweet from '../models/tweet';
import User from '../models/user';
import TwitterClient from '../twitter';

export enum TimelineType {
    Home = 'home',
    User = 'user',
    Mentions = 'mentions',
    OtherUser = 'other',
    Search = 'search',
    Post = 'post',
    Trend = 'trend',
    Image = 'image'
}

export interface Timeline {
    getData(loadNew: boolean): Thenable<any>;
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
                    timeline = this.otherUserTimelineList.find((v) => { return v.query == param; });
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
                    timeline = this.searchTimelineList.find((v) => { return v.query == param; });
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
    type: TimelineType;
    query: string;

    sinceId: string;
    maxId: string;
    tweets: Tweet[];

    params: any = { count: 100 };
    endpoint: string = '';

    title: string;

    getTweets(loadNew: boolean): Thenable<void> {
        console.log('getTweets: ' + loadNew);
        const self = this;
        var params: any = Object.assign({}, this.params);
        if (this.sinceId && loadNew) {
            params.since_id = this.sinceId;
        }

        if (this.maxId && !loadNew) {
            params.max_id = this.maxId;
        }

        return TwitterClient.get(self.endpoint, params).then((tweets: any) => {
            if (!(tweets instanceof Array)) {
                tweets = tweets.statuses;
            };

            if (loadNew) {
                tweets = tweets.reverse();
            } else {
                // older tweet has a duplicate entry
                tweets.shift();
            }

            tweets.forEach((value) => {
                if (loadNew) {
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
        });
    }

    getData(loadNew: boolean): Thenable<any> {
        const self = this;
        return this.getTweets(loadNew).then(() => {
            return {
                title: self.title,
                type: self.type,
                query: self.query,
                tweets: self.tweets
            };
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
    
    getData(loadNew: boolean): Thenable<any> {
        const self = this;
        return this.getTweets(loadNew).then(() => {
            return TwitterClient.get(self.profileEndPoint, { include_entities: true }).then((user) => {
                var userProfile = User.fromJson(user);
                return {
                    title: self.title,
                    type: self.type,
                    query: self.query,
                    tweets: self.tweets,
                    user: userProfile
                };
            })
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

    getData(loadNew: boolean): Thenable<any> {
        const self = this;
        console.log('OtherUsertimeline: getNew ' + loadNew);
        return this.getTweets(loadNew).then(() => {
            return TwitterClient.get(self.profileEndPoint, { screen_name: self.query, include_entities: true }).then((user) => {
                var userProfile = User.fromJson(user);
                return {
                    title: self.title,
                    type: self.type,
                    query: self.query,
                    tweets: self.tweets,
                    user: userProfile
                };
            })
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

    private parentGetNew(loadNew: boolean): Thenable<void> {
        return super.getTweets(loadNew);
    }

    getTweets(loadNew: boolean): Thenable<void> {
        const self = this;

        var params = Object.assign({}, this.params);
        if (this.sinceId && loadNew) {
            params.since_id = this.sinceId;
        }
        if (this.maxId && !loadNew) {
            params.max_id = this.maxId;
        }

        params.q = this.keyword;
        params.include_entities = false;

        return TwitterClient.get(self.searchEndPoint, params).then((tweets: any) => {
            if (!(tweets instanceof Array)) {
                tweets = tweets.statuses;
            };
            self.params.id = (<any[]>tweets).map<string>((value): string => { return value.id_str; }).join(',');
            console.log('Search results: ' + self.params.id);
            self.params.include_entities = true;
            return self.parentGetNew(loadNew);
        });
    }
}