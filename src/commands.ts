import * as vscode from 'vscode'
import {TimelineFactory, TimelineType, Timeline} from './twitter'

function getNewInTimeline(message: string, timeline: Timeline) {
	vscode.window.setStatusBarMessage(message,
		timeline.getNew().then((content) => {
			const filename = timeline.filename;
			console.log('Twitter buffer file: ' + filename);
			vscode.workspace.openTextDocument(filename).then((doc) => {
				vscode.window.showTextDocument(doc).then((editor) => {
					editor.edit((builder) => {
						builder.insert(new vscode.Position(0, 0), content);
					}).then(applied => {
						vscode.commands.executeCommand("workbench.action.markdown.togglePreview");
						console.log('Done');
					}, (error) => {
						console.error('edit failed: ' + error);
						vscode.window.showErrorMessage('Twitter failed to initialize. Please run command \'Reload Window\' to fix it.');
					});
				}, (error) => {
					console.error('showTextDocument failed: ' + error);
				});
			}, (error) => {
				console.error('openTextDocument failed: ' + error);
			});
		}, (error: string) => {
			vscode.window.showErrorMessage('Failed to retrieve timeline: ' + error);
		})
	);
}

function refreshTimeline(type: TimelineType) {
	const timeline = TimelineFactory.getTimeline(type);
	getNewInTimeline('Refreshing timeline...', timeline);
}

export function twitterStart() {
	// Display a message box to the user
	const timeline = TimelineType.Home;
	refreshTimeline(timeline);
}

export function twitterTimeline() {
	const timelines = [
		{ label: 'Home', description: 'Home timeline', type: TimelineType.Home },
		{ label: 'User', description: 'User timeline', type: TimelineType.User }
	];
	vscode.window.showQuickPick(timelines).then((v) => {
		console.log('Type: ' + v.type + ' selected');
		refreshTimeline(v.type);
	});
}

export function twitterSearch() {
	vscode.window.showInputBox({
		placeHolder: 'Search Twitter',
		prompt: 'Search Twitter. '
	}).then(value => {
		if (value) {
			console.log('Searching for ' + value);
			const timeline = TimelineFactory.getSearchTimeline(value);
			getNewInTimeline('Searching for ' + value + ' ...', timeline);
		}
	});
}

export function twitterPost() {
	vscode.window.showInputBox({
		placeHolder: 'What\'s happening?',
		prompt: 'Post your status to Twitter. '
	}).then(value => {
		if (value) {
			console.log("Posting... " + value);
			vscode.window.setStatusBarMessage('Posting status...',
				TimelineFactory.getTimeline(TimelineType.Home).post(value).then(result => {
					vscode.window.showInformationMessage('Your status was posted.');
				}, (error) => {
					vscode.window.showErrorMessage('Failed to post the status: ' + error);
				})
			);
		}
	});
}