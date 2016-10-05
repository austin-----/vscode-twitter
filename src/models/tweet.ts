import * as vscode from 'vscode';
import User from './user';
import Entity from './entity';

export default class Tweet {
    id: string;
    text: string;
    created: string;
    quoted: Tweet;
    entity: Entity;
    retweetedStatus: Tweet;
    retweetCount: number;
    retweeted: boolean;
    likeCount: number;
    liked: boolean;
    user: User;

    constructor(id: string, created: string, text: string, user:User, retweetCount: number, retweeted: boolean, likeCount: number, liked: boolean) {
        this.id = id;
        this.created = created;
        this.text = text;
        this.user = user;
        this.retweetCount = retweetCount;
        this.retweeted = retweeted;
        this.likeCount = likeCount;
        this.liked = liked;
    }

    static fromJson(tweetJson: any): Tweet {
        var user = User.fromJson(tweetJson.user);
        
        var tweet = new Tweet(tweetJson.id_str, tweetJson.created_at, tweetJson.text, user, tweetJson.retweet_count, tweetJson.retweeted, tweetJson.favorite_count, tweetJson.favorited);
        if (tweetJson.quoted_status) {
            tweet.quoted = Tweet.fromJson(tweetJson.quoted_status);
        }

        if (tweetJson.retweeted_status) {
            tweet.retweetedStatus = Tweet.fromJson(tweetJson.retweeted_status);
        }
	    
        tweet.entity = Entity.fromJson(tweetJson.entities, tweetJson.extended_entities);
        return tweet;
    }
}