// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as commands from './commands';

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
}