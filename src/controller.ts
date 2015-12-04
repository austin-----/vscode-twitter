import * as events from 'events';
import * as vscode from 'vscode'
import {TimelineFactory, TimelineType, Timeline} from './twitter';
import Wizard from './wizard';
import View from './view';
import Document from './document';

export default class Controller implements vscode.Disposable {
	private extensionContext: vscode.ExtensionContext;
	private event: events.EventEmitter = new events.EventEmitter();
	private timelineForRefresh: Timeline;
	private view: View;
	private refreshTimelineInProgress: boolean = false;

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
				if (!this.timelineForRefresh.refreshInProgress) {
					vscode.commands.executeCommand('workbench.action.markdown.togglePreview');
				}
				
				this.view.showRefreshButton();
			} else {
				this.view.hideRefreshButton();
				this.timelineForRefresh = null;
			}
		}
	}

	private refreshTimeline(message: string, timeline: Timeline) {
		const self = this;
		vscode.window.setStatusBarMessage(message,
			timeline.getNew().then((content) => {
				timeline.refreshInProgress = true;
				Document.openDocument(timeline.filename, content).then(() => {
					self.view.showRefreshButton();
					vscode.commands.executeCommand("workbench.action.markdown.togglePreview");
					timeline.refreshInProgress = false;
				}, (error) => {
					timeline.refreshInProgress = false;
				});
			}, (error: string) => {
				vscode.window.showErrorMessage('Failed to retrieve timeline: ' + error);
			})
		);
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
				console.log('Searching for ' + value);
				const timeline = TimelineFactory.getSearchTimeline(value);
				self.refreshTimeline('Searching for ' + value + ' ...', timeline);
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
					console.log('Searching for ' + value);
					const timeline = TimelineFactory.getSearchTimeline(value);
					self.refreshTimeline('Searching for ' + value + ' ...', timeline);
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
	}

	deactivate() {
		console.log('Twitter deactivated!');
	}

	dispose() {
		this.deactivate();
	}
}