import * as vscode from 'vscode';
import {TimelineFactory, TimelineType, Timeline} from './twitter';
import Wizard from './wizard';

function doInsert(doc: vscode.TextDocument, editor: vscode.TextEditor, content: string): Thenable<void> {
	return editor.edit((builder) => {
		builder.insert(new vscode.Position(0, 0), content);
	}).then(applied => {
		doc.save();
		vscode.commands.executeCommand("workbench.action.markdown.togglePreview");
		console.log('Twitter edit done');
	}, (error) => {
		console.error('Twitter edit failed: ');
		console.error(error);
		vscode.window.showErrorMessage('Twitter failed to initialize. Please run command \'Reload Window\' to fix it.');
	});
}

function doDeleteAndInsert(range: vscode.Range, doc: vscode.TextDocument, editor: vscode.TextEditor, content: string): Thenable<void> {
	return editor.edit((builder) => {
		builder.delete(range);
	}).then(applied => {
		doInsert(doc, editor, content);
	}, error => {
		console.error('edit failed: ');
		console.error(error);
		vscode.window.showErrorMessage('Twitter failed to initialize. Please run command \'Reload Window\' to fix it.');
	})
}

function getNewInTimeline(message: string, timeline: Timeline) {
	vscode.window.setStatusBarMessage(message,
		timeline.getNew().then((content) => {
			const filename = timeline.filename;
			console.log('Twitter buffer file: ' + filename.fsPath);
			vscode.workspace.openTextDocument(filename.fsPath).then((doc) => {
				doc[TimelineFactory.shouldTogglePreview] = false;
				console.log('Twitter doc opened');
				vscode.window.showTextDocument(doc).then((editor) => {
					console.log('Twitter edit begins');
					const start = doc.lineAt(0).range.start;
					const end = doc.lineAt(doc.lineCount - 1).range.end;
					var needClear = false;
					if (start.compareTo(end) < 0) {
						needClear = true;
					}
					if (needClear) {
						doDeleteAndInsert(new vscode.Range(start, end), doc, editor, content).then(() => {
							doc[TimelineFactory.shouldTogglePreview] = true;
							doc[TimelineFactory.targetTimeline] = timeline;
							TimelineFactory.refreshTargetTimeline = doc[TimelineFactory.targetTimeline];
							TimelineFactory.statusBarItemRefresh.show();
						});
					} else {
						doInsert(doc, editor, content).then(() => {
							doc[TimelineFactory.shouldTogglePreview] = true;
							doc[TimelineFactory.targetTimeline] = timeline;
							TimelineFactory.refreshTargetTimeline = doc[TimelineFactory.targetTimeline];
							TimelineFactory.statusBarItemRefresh.show();
						});	
					}
				}, (error) => {
					console.error('showTextDocument failed: ');
					console.error(error);
				});
			}, (error) => {
				console.error('openTextDocument failed: ');
				console.error(error);
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

function twitterStartInternal() {
	const timeline = TimelineType.Home;
	refreshTimeline(timeline);
}

export function twitterStart() {
	Wizard.checkConfigurationAndRun(twitterStartInternal);
}

function twitterTimelineInternal() {
	const timelines = [
		{ label: 'Home', description: 'Go to the Home Timeline', type: TimelineType.Home },
		{ label: 'User', description: 'Go to the User Timeline', type: TimelineType.User },
		{ label: 'Search', description: 'Search Twitter', type: TimelineType.Search },
		{ label: 'Trends', description: 'Twitter Trends', type: TimelineType.Trend },
		{ label: 'Post', description: 'Post your status to Twitter', type: TimelineType.Post },
	];
	vscode.window.showQuickPick(timelines, {matchOnDescription: true, placeHolder: 'Select a Task'}).then((v) => {
		if (v) {
			console.log('Type: ' + v.type + ' selected');
			switch (v.type) {
				case TimelineType.Home:
				case TimelineType.User:
					refreshTimeline(v.type);
					break;
				case TimelineType.Search:
					twitterSearch();
					break;
				case TimelineType.Post:
					twitterPost();
					break;
				case TimelineType.Trend:
					twitterTrend();
					break;
			}
		}
	});
}

export function twitterTimeline() {
	Wizard.checkConfigurationAndRun(twitterTimelineInternal);
}

function twitterTrendInternal() {
	TimelineFactory.getTimeline(TimelineType.Home).getTrends().then(trend => {
		vscode.window.showQuickPick(trend, { matchOnDescription: true, placeHolder: 'Select a Trend' }).then(value => {
			if (value) {
				console.log('Searching for ' + value);
				const timeline = TimelineFactory.getSearchTimeline(value);
				getNewInTimeline('Searching for ' + value + ' ...', timeline);
			}
		});
	}, error => {
		vscode.window.showErrorMessage('Failed to retrieve Twitter Trends: ' + error);
	});
}

export function twitterTrend() {
	Wizard.checkConfigurationAndRun(twitterTrendInternal);
}

function twitterSearchInternal() {
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
	
	vscode.window.showInputBox({
		placeHolder: 'Search Twitter',
		prompt: 'Tip: ' + tips[Math.floor(Math.random() * tips.length)]
	}).then(value => {
		if (value) {
			console.log('Searching for ' + value);
			const timeline = TimelineFactory.getSearchTimeline(value);
			getNewInTimeline('Searching for ' + value + ' ...', timeline);
		}
	});
}

export function twitterSearch() {
	Wizard.checkConfigurationAndRun(twitterSearchInternal);
}


function twitterPostInternal() {
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

export function twitterPost() {
	Wizard.checkConfigurationAndRun(twitterPostInternal);
}

function twitterRefreshInternal() {
	const timeline = TimelineFactory.refreshTargetTimeline;
	if (timeline) {
		getNewInTimeline('Refreshing timeline...', timeline);
	}
}

export function twitterRefresh() {
	Wizard.checkConfigurationAndRun(twitterRefreshInternal);
}

export function twitterWizard() {
	Wizard.setup(false);
}