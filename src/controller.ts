import * as events from 'events';
import * as vscode from 'vscode'
import {TimelineFactory, TimelineType, Timeline} from './twitter';
import Wizard from './wizard';
import View from './view';
import Document from './document';
import * as fs from 'fs';

export default class Controller implements vscode.Disposable {
	private extensionContext: vscode.ExtensionContext;
	private event: events.EventEmitter = new events.EventEmitter();
	private timelineForRefresh: Timeline;
	private view: View;

	static CmdStart: string = 'twitter.start';
	static CmdPost: string = 'twitter.post';
	static CmdSelect: string = 'twitter.select';
	static CmdSearch: string = 'twitter.search';
	static CmdWizard: string = 'twitter.wizard';
	static CmdRefresh: string = 'twitter.refresh';
	static CmdTrend: string = 'twitter.trend';

	constructor(context: vscode.ExtensionContext, view: View) {
		this.extensionContext = context;
		this.view = view;
	}

	private registerCommand(command: string) {
		const self = this;
		this.extensionContext.subscriptions.push(vscode.commands.registerCommand(command, () => {
			self.event.emit(command);
		}));
	}

	private onEditorChange(editor: vscode.TextEditor) {
		if (editor) {
			console.log('editor changed: ' + editor.document.fileName);
			if (TimelineFactory.isTwitterBuffer(editor.document)) {
				console.log('it is a twitter buffer file');
				this.timelineForRefresh = TimelineFactory.getTimelineByDocument(editor.document);
				const doc = editor.document as any;
				if (doc.refreshInProgress != true) {
					console.log('toggle preview');
					vscode.commands.executeCommand('workbench.action.markdown.togglePreview');
				}
				
				this.view.showRefreshButton();
			} else {
				this.view.hideRefreshButton();
			}
		}
	}

	private refreshTimeline(message: string, timeline: Timeline, newWindow: boolean = false) {
		const self = this;
		vscode.window.setStatusBarMessage(message,
			timeline.getNew().then((content) => {
				Document.openDocument(timeline.filename, content, newWindow).then((doc) => {
					self.timelineForRefresh = timeline;
					self.view.showRefreshButton();
					console.log('toggle preview');
					vscode.commands.executeCommand("workbench.action.markdown.togglePreview");
					doc[Document.LockKey] = false;
				}, (doc) => {
					if (doc != null) {
						doc[Document.LockKey] = false;
					}
				});
			}, (error: string) => {
				vscode.window.showErrorMessage('Failed to retrieve timeline: ' + error);
			})
		);
	}
	
	private openSearchTimeline(value: string) {
		console.log('Searching for ' + value);
		const timeline = TimelineFactory.getSearchTimeline(value);
		this.refreshTimeline('Searching for ' + value + ' ...', timeline, true);
	}
	
	private openOtherUserTimeline(value: string) {
		console.log('Searching for @' + value);
		const timeline = TimelineFactory.getOtherUserTimeline(value);
		this.refreshTimeline('Searching for @' + value + ' ...', timeline, true);
	}
	
	private openImage(url: string) {
		console.log('Opening image ' + url);
		const timeline = TimelineFactory.getImageView(url);
		this.refreshTimeline('Opening image ' + url + ' ...', timeline, true);
	}
	
	private refreshTimelineOfType(type: TimelineType) {
		const timeline = TimelineFactory.getTimeline(type);
		this.refreshTimeline('Refreshing timeline...', timeline);
	}

	private twitterRefreshInternal() {
		const timeline = this.timelineForRefresh;
		if (timeline) {
			this.refreshTimeline('Refreshing timeline...', timeline);
		}
	}

	private onTwitterRefresh() {
		const self = this;
		Wizard.checkConfigurationAndRun(() => { self.twitterRefreshInternal(); });
	}

	private twitterSearchInternal() {
		const self = this;
		this.view.showSearchInputBox().then(value => {
			if (value) {
				self.openSearchTimeline(value);
			}
		});
	}

	private onTwitterSearch() {
		const self = this;
		Wizard.checkConfigurationAndRun(() => { this.twitterSearchInternal(); });
	}

	private twitterPostInternal() {
		this.view.showPostInputBox().then(value => {
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

	private onTwitterPost() {
		const self = this;
		Wizard.checkConfigurationAndRun(() => { self.twitterPostInternal(); });
	}

	private onTwitterWizard() {
		Wizard.setup(false);
	}

	private twitterTrendInternal() {
		const self = this;
		TimelineFactory.getTimeline(TimelineType.Home).getTrends().then(trend => {
			vscode.window.showQuickPick(trend, { matchOnDescription: true, placeHolder: 'Select a Trend' }).then(value => {
				if (value) {
					self.openSearchTimeline(value);
				}
			});
		}, error => {
			vscode.window.showErrorMessage('Failed to retrieve Twitter Trends: ' + error);
		});
	}

	private onTwitterTrend() {
		const self = this;
		Wizard.checkConfigurationAndRun(() => { self.twitterTrendInternal(); });
	}

	private twitterStartInternal() {
		this.refreshTimelineOfType(TimelineType.Home);
	}

	private onTwitterStart() {
		const self = this;
		Wizard.checkConfigurationAndRun(() => { self.twitterStartInternal(); });
	}
	
	private twitterTimelineInternal() {
		const self = this;
		this.view.showSelectPick().then((v) => {
			if (v) {
				console.log('Type: ' + v.type + ' selected');
				switch (v.type) {
					case TimelineType.Home:
					case TimelineType.User:
					case TimelineType.Mentions:
						self.refreshTimelineOfType(v.type);
						break;
					case TimelineType.Search:
						self.twitterSearchInternal();
						break;
					case TimelineType.Post:
						self.twitterPostInternal();
						break;
					case TimelineType.Trend:
						self.twitterTrendInternal();
						break;
				}
			}
		});
	}

	private onTwitterTimeline() {
		const self = this;
		Wizard.checkConfigurationAndRun(() => { self.twitterTimelineInternal(); });
	}
	
	private app: any = require('express')();

	activate() {
		const self = this;

		this.registerCommand(Controller.CmdStart);
		this.registerCommand(Controller.CmdPost);
		this.registerCommand(Controller.CmdSelect);
		this.registerCommand(Controller.CmdSearch);
		this.registerCommand(Controller.CmdWizard);
		this.registerCommand(Controller.CmdRefresh);
		this.registerCommand(Controller.CmdTrend);

		this.event.on(Controller.CmdStart, () => { self.onTwitterStart(); });
		this.event.on(Controller.CmdPost, () => { self.onTwitterPost(); });
		this.event.on(Controller.CmdSelect, () => { self.onTwitterTimeline(); });
		this.event.on(Controller.CmdSearch, () => { self.onTwitterSearch(); });
		this.event.on(Controller.CmdWizard, () => { self.onTwitterWizard(); });
		this.event.on(Controller.CmdRefresh, () => { self.onTwitterRefresh(); });
		this.event.on(Controller.CmdTrend, () => { self.onTwitterTrend(); });

		this.extensionContext.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((editor) => { self.onEditorChange(editor); }));
		this.view.activate();

		// respond with "hello world" when a GET request is made to the homepage
		this.app.get('/search/:q', function(req, res) {
  			res.send('Searching for ' + req.params.q);
			self.openSearchTimeline(req.params.q);
		});
		this.app.get('/user/:screen_name', function(req, res) {
  			res.send('Searching for @' + req.params.screen_name);
			self.openOtherUserTimeline(req.params.screen_name);
		});
		this.app.get('/image/:img', function(req, res) {
			const image = decodeURIComponent(req.params.img);
			res.send('Opening image ' + image);
			self.openImage(image);
		});
		this.app.get('/refresh/:signature', function(req, res) {
			res.send('Refreshing');
			const signature = decodeURIComponent(req.params.signature);
			const timeline = TimelineFactory.getTimelineBySignature('#' + signature);
			timeline.getNew().then((content) => {
				fs.writeFileSync(timeline.filename, content);
				console.log('toggle preview');
				vscode.commands.executeCommand("workbench.action.markdown.togglePreview");
			}, (error: string) => {
				vscode.window.showErrorMessage('Failed to retrieve timeline: ' + error);
			})
		});
		this.app.listen(3456);
	}

	deactivate() {
		console.log('Twitter deactivated!');
	}

	dispose() {
		this.deactivate();
		this.view.dispose();
	}
}