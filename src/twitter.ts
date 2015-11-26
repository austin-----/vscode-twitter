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
	filename: vscode.Uri;
	since_id : string;
	
	static createFile(contents = ''): vscode.Uri {
		const tmpFile = join(os.tmpdir(), "Twitter.md");
		fs.writeFileSync(tmpFile, 'Twitter');
		return vscode.Uri.parse('file:' + tmpFile);
	}

	getTimeline(): Thenable<string> {
		const self = this;
		var params:any = {count: 100};
		if (this.since_id) {
			params.since_id = this.since_id;
		}
		return new Promise((resolve, reject) => {
			self.client.get('statuses/home_timeline', params, function(error: any[], tweets: any[], resposne) {
				if (!error) {
					console.log(tweets);
					var result = '';
					var first = true;
					tweets.forEach((value, index, array) => {
						if (first) {
							first = false;
							self.since_id = value.id_str;
						}
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
	
	postStatus(status: string): Thenable<string> {
		const self = this;
		return new Promise((resolve, reject) => {
			self.client.post('statuses/update', {status: status}, function(error, data, response) {
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
	
	private static _instance: VSTwitter = new VSTwitter();
	
	static getInstance(): VSTwitter {
		return VSTwitter._instance;
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
		this.filename = vscode.Uri.parse('untitled:' + join(os.tmpdir(), rndName() + "_Twitter.md"));
	}
}