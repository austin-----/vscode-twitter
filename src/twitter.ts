import * as vscode from 'vscode'
import * as os from 'os'
import * as fs from 'fs'
import {join} from 'path';
import Tweet from './tweet'

var Twitter = require('twitter');

function rndName() {
	return Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 10);
}

export default class VSTwitter {
	client: any;
	
	static createFile(contents = ''): vscode.Uri {
		const tmpFile = join(os.tmpdir(), "Twitter.md");
		fs.writeFileSync(tmpFile, 'Twitter');
		return vscode.Uri.parse('file:' + tmpFile);
	}

	getTimeline(): Thenable<string> {
		const self = this;
		return new Promise((resolve, reject) => {
			self.client.get('statuses/home_timeline', {}, function(error: any[], tweets: any[], resposne) {
				if (!error) {
					console.log(tweets);
					var result = '';
					tweets.forEach((value, index, array) => {
						result += Tweet.fromJson(value).toMarkdown();
					});
					resolve(result);
				} else {
					console.log(error);
					var msg = error.map((value, index, array) => { return value.message; }).join(';');
					reject(msg);
				}
			});
		});
	}
	
	postStatus(status: string): Thenable<boolean> {
		const self = this;
		return new Promise((resolve, reject) => {
			self.client.post('statuses/update', {status: status}, function(error, data, response) {
				if (!error) {
					console.log(data);
					resolve(true);
				} else {
					console.log(error);
					resolve(false);
				}
			});
		});
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
	}
}