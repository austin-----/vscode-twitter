import * as vscode from 'vscode';
import Controller from './controller';
import {TimelineType} from './twitter';

export default class View implements vscode.Disposable {
	private statusBarItemMain: vscode.StatusBarItem;
	
	activate() {
		this.statusBarItemMain = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 6);
		this.statusBarItemMain.text = '$(home)Twitter'
		this.statusBarItemMain.tooltip = 'Twitter in VS Code';
		this.statusBarItemMain.command = Controller.CmdSelect;
		this.statusBarItemMain.show();
	}
	
	showPostInputBox(): Thenable<string> {
		return vscode.window.showInputBox({
			placeHolder: 'What\'s happening?  (tip: use \'D username message\' for direct message)',
			prompt: 'Post your status to Twitter. '
		});
	}
    
    showReplyInputBox(user: string): Thenable<string> {
		return vscode.window.showInputBox({
			placeHolder: 'Reply to @' + user,
			prompt: 'Post your reply to @' + user,
            value: '@' + user + ' '
		});
	}
    
    showCommentInputBox(brief: string): Thenable<string> {
		return vscode.window.showInputBox({
			placeHolder: 'Put your comments here',
			prompt: 'Comment on ' + brief
		});
	}
	
	showSearchInputBox(): Thenable<string> {
		const tips: string[] = [
			'watching now | containing both “watching” and “now”.',
			'“happy hour” | containing the exact phrase “happy hour”.',
			'love OR hate | containing either “love” or “hate” (or both).',
			'beer -root	| containing “beer” but not “root”.',
			'#haiku	| containing the hashtag “haiku”.',
			'from:alexiskold | sent from person “alexiskold”.',
			'to:techcrunch | sent to person “techcrunch”.',
			'@mashable | referencing person “mashable”.',
			'superhero since:2015-07-19	| containing “superhero” since “2015-07-19”.',
			'ftw until:2015-07-19 | containing “ftw” and sent before “2015-07-19”.',
			'movie -scary :) | containing “movie”, but not “scary”, and with a positive attitude.',
			'flight :( | containing “flight” and with a negative attitude.',
			'traffic ? | containing “traffic” and asking a question.',
			'hilarious filter:links	| containing “hilarious” and linking to URL.',
			'news source:twitterfeed | containing “news” and entered via TwitterFeed.'
		];

		return vscode.window.showInputBox({
			placeHolder: 'Search Twitter',
			prompt: 'Tip: ' + tips[Math.floor(Math.random() * tips.length)]
		});
	}
	
	showSelectPick(): Thenable<any> {
		const timelines = [
			{ label: 'Home', description: 'Go to the Home Timeline', type: TimelineType.Home },
			{ label: 'User', description: 'Go to the User Timeline', type: TimelineType.User },
			{ label: 'Mentions', description: 'Go to the Mentions Timeline', type: TimelineType.Mentions },
			{ label: 'Search', description: 'Search Twitter', type: TimelineType.Search },
			{ label: 'Trends', description: 'Twitter Trends', type: TimelineType.Trend },
			{ label: 'Post', description: 'Post your status to Twitter', type: TimelineType.Post },
		];
		return vscode.window.showQuickPick(timelines, { matchOnDescription: true, placeHolder: 'Select a Task' });
	}
	
	dispose() {
		this.statusBarItemMain.dispose();
	}
}