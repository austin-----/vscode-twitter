import * as vscode from 'vscode'
import Tweet from './models/tweet';
import User from './models/user';

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
        params.tweet_mode = 'extended';
        return new Promise((resolve, reject) => {
            TwitterClient.client.get(endpoint, params, function(error: any[], items: any) {
                if (!error) {
                    resolve(items);
                } else {
                    console.error(error);
                    if (!(error instanceof Array)) {
                        error = [error];
                    }
                    var msg = error.map((value) => { return value.message; }).join('; ');
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
                    resolve(trendsArray.map((value) => { const volume = value.tweet_volume ? ' ' + value.tweet_volume + ' ' + '\u2605'.repeat(Math.log(value.tweet_volume)) : ' new'; return { label: value.name, description: volume, query: value.query }; }));
                } catch (ex) {
                    resolve(['']);
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
			TwitterClient.client.post('statuses/update', payload, function(error, data) {
				if (!error) {
					console.log(data);
					resolve('OK');
				} else {
					console.error(error);
					var msg = error.map((value) => { return value.message; }).join(';');
					reject(msg);
				}
			});
		});
	}
    
    static reply(content: string, id: string): Thenable<string> {
        return TwitterClient.post(content, id);
    }
    
    static like(id: string, unlike: boolean): Thenable<Tweet> {
        const action = (unlike ? 'destroy' : 'create');
        return new Promise((resolve, reject) => {
            TwitterClient.client.post('favorites/' + action, {id: id, include_entities: false, tweet_mode: 'extended'}, function(error, tweet){
                if (!error) {
                    const t = Tweet.fromJson(tweet);
                    resolve(t);
                } else {
                    console.error(error);
					var msg = error.map((value) => { return value.message; }).join(';');
					reject(msg);
                }
            });
        });
    }
    
    static retweet(id: string): Thenable<Tweet> {
        return new Promise((resolve, reject) => {
            TwitterClient.client.post('statuses/retweet', {id: id, tweet_mode: 'extended'}, function(error, tweet){
                if (!error) {
                    const t = Tweet.fromJson(tweet);
                    resolve(t);
                } else {
                    console.error(error);
					var msg = error.map((value) => { return value.message; }).join(';');
					reject(msg);
                }
            });
        });
    }
    
    static follow(screenName: string, unfollow: boolean):Thenable<User> {
        const action = (unfollow ? 'destroy' : 'create');
        return new Promise((resolve, reject) => {
            TwitterClient.client.post('friendships/' + action, {screen_name: screenName}, function(error, user){
                if (!error) {
                    resolve(User.fromJson(user));
                } else {
                    console.error(error);
					var msg = error.map((value) => { return value.message; }).join(';');
					reject(msg);
                }
            });
        });
    }
}
