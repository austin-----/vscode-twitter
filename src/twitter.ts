import * as vscode from 'vscode'
import * as os from 'os'
import * as fs from 'fs'
import {join} from 'path';
import Tweet from './models/tweet';
import HTMLFormatter from './models/html';

var Twitter = require('twitter');

export default class TwitterClient {
    private static get client(): any {
        var configuration = vscode.workspace.getConfiguration('twitter');
        var consumerKey = configuration.get('consumerkey');
        var consumerSecret = configuration.get('consumersecret');
        var accessTokenKey = configuration.get('accesstokenkey');
        var accessTokenSecret = configuration.get('accesstokensecret');
        var client = new Twitter({
            consumer_key: consumerKey,
            consumer_secret: consumerSecret,
            access_token_key: accessTokenKey,
            access_token_secret: accessTokenSecret
        });
        return client;
    };
    
    static get(endpoint: string, params: any): Thenable<any> {
        return new Promise((resolve, reject) => {
            TwitterClient.client.get(endpoint, params, function(error: any[], items: any, response) {
                if (!error) {
                    resolve(items);
                } else {
                    console.error(error);
                    if (!(error instanceof Array)) {
                        error = [error];
                    }
                    var msg = error.map((value, index, array) => { return value.message; }).join('; ');
                    reject(msg);
                }
            });
        });
    }
    
    static getTrends(): Thenable<any[]> {
        var params: any = {};
        params.id = 1;
        return new Promise((resolve, reject) => {
            TwitterClient.get('trends/place', params).then((trends: any[]) => {
                console.log(trends);
                try {
                    const trendsArray: any[] = trends[0].trends;
                    resolve(trendsArray.map((value, index, array) => { const volume = value.tweet_volume ? ' ' + value.tweet_volume + ' ' + '\u2605'.repeat(Math.log(value.tweet_volume)) : ' new'; return { label: value.name, description: volume, query: value.query }; }));
                } catch (ex) {
                    resolve('');
                }
            }, (error) => {
                reject(error);
            });
        });
    }
    
    static post(status: string, inReplyToId: string = null): Thenable<string> {
        var payload: any = {status: status};
        if (inReplyToId != null) {
            payload.in_reply_to_status_id = inReplyToId;
        }
		return new Promise((resolve, reject) => {
			TwitterClient.client.post('statuses/update', payload, function(error, data, response) {
				if (!error) {
					console.log(data);
					resolve('OK');
				} else {
					console.error(error);
					var msg = error.map((value, index, array) => { return value.message; }).join(';');
					reject(msg);
				}
			});
		});
	}
    
    static reply(content: string, id: string): Thenable<string> {
        return TwitterClient.post(content, id);
    }
    
    static like(id: string, unlike: boolean): Thenable<string> {
        const action = (unlike ? 'destroy' : 'create');
        return new Promise((resolve, reject) => {
            TwitterClient.client.post('favorites/' + action, {id: id, include_entities: false}, function(error, tweet, response){
                if (!error) {
                    const t = Tweet.fromJson(tweet);
                    resolve(HTMLFormatter.formatLike(t));
                } else {
                    console.error(error);
					var msg = error.map((value, index, array) => { return value.message; }).join(';');
					reject(msg);
                }
            });
        });
    }
    
    static retweet(id: string): Thenable<string> {
        return new Promise((resolve, reject) => {
            this.client.post('statuses/retweet', {id: id}, function(error, tweet, response){
                if (!error) {
                    const t = Tweet.fromJson(tweet);
                    resolve(HTMLFormatter.formatRetweet(t));
                } else {
                    console.error(error);
					var msg = error.map((value, index, array) => { return value.message; }).join(';');
					reject(msg);
                }
            });
        });
    }
    
    static follow(screenName: string, unfollow: boolean) {
        const action = (unfollow ? 'destroy' : 'create');
        return new Promise((resolve, reject) => {
            TwitterClient.client.post('friendships/' + action, {screen_name: screenName}, function(error, tweet, response){
                if (!error) {
                    resolve(HTMLFormatter.formatFollow(!unfollow, screenName));
                } else {
                    console.error(error);
					var msg = error.map((value, index, array) => { return value.message; }).join(';');
					reject(msg);
                }
            });
        });
    }
}
