// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as commands from './commands';
import {Signature, TimelineFactory, TimelineType} from './twitter';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "vscode-twitter" is now active!'); 
	
	context.subscriptions.push(vscode.commands.registerCommand('twitter.start', () => {
		commands.twitterStart();
	}));
	
	context.subscriptions.push(vscode.commands.registerCommand('twitter.post', () => {
		commands.twitterPost();
	}));
	
	context.subscriptions.push(vscode.commands.registerCommand('twitter.select', () => {
		commands.twitterTimeline();
	}));
	
	context.subscriptions.push(vscode.commands.registerCommand('twitter.search', () => {
		commands.twitterSearch();
	}));
	
	context.subscriptions.push(vscode.commands.registerCommand('twitter.refresh', () => {
		commands.twitterRefresh();
	}));
	
	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((editor) => {
		console.log('editor changed: ' + editor.document.fileName);
		if (TimelineFactory.isTwitterBuffer(editor)) {
			console.log('it is a twitter buffer file');
			if (TimelineFactory.shouldTogglePreview[editor.document.fileName] == true) {
				vscode.commands.executeCommand('workbench.action.markdown.togglePreview');
			}
			
			if (editor.document.fileName.startsWith('Twitter_HomeTimeline')) {
				TimelineFactory.refreshTargetTimeline = TimelineFactory.getTimeline(TimelineType.Home);
			} else if (editor.document.fileName.startsWith('Twitter_UserTimeline')) {
				TimelineFactory.refreshTargetTimeline = TimelineFactory.getTimeline(TimelineType.User);
			} else if (editor.document.fileName.startsWith('Twitter_Search_')) {
				const parts: string[] = editor.document.fileName.split('_');
				const keyword = parts[2];
				TimelineFactory.refreshTargetTimeline = TimelineFactory.getSearchTimeline(decodeURIComponent(keyword));
			}
			
			TimelineFactory.statusBarItemRefresh.show();
		} else {
			TimelineFactory.statusBarItemRefresh.hide();
			TimelineFactory.refreshTargetTimeline = null;
		}
	}));
	
	TimelineFactory.statusBarItemMain = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 6);
	TimelineFactory.statusBarItemMain.text = '$(home)Twitter'
	TimelineFactory.statusBarItemMain.tooltip = 'Twitter in VS Code';
	TimelineFactory.statusBarItemMain.command = 'twitter.select';
	TimelineFactory.statusBarItemMain.show();
	
	TimelineFactory.statusBarItemRefresh = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 5);
	TimelineFactory.statusBarItemRefresh.text = '$(sync)Refresh';
	TimelineFactory.statusBarItemRefresh.tooltip = 'Refresh the current timeline';
	TimelineFactory.statusBarItemRefresh.command = 'twitter.refresh';
}