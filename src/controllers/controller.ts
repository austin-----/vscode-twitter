import * as events from 'events';
import * as vscode from 'vscode';
import TwitterClient from '../twitter';
import Wizard from '../wizard';
import View from '../views/view';
import * as timeline from '../models/timeline';
import TwitterTimelineContentProvider from '../models/content';
import * as querystring from 'querystring';
import {WebViewController} from './webviewcontroller';

export default class MainController implements vscode.Disposable {
    private extensionContext: vscode.ExtensionContext;
    private event: events.EventEmitter = new events.EventEmitter();
    private view: View;
    private contentProvider: TwitterTimelineContentProvider;
    private webviewController: WebViewController;

    static CmdStart: string = 'twitter.start';
    static CmdPost: string = 'twitter.post';
    static CmdSelect: string = 'twitter.select';
    static CmdSearch: string = 'twitter.search';
    static CmdWizard: string = 'twitter.wizard';
    static CmdTrend: string = 'twitter.trend';

    constructor(context: vscode.ExtensionContext, view: View) {
        this.extensionContext = context;
        this.view = view;
        this.contentProvider = new TwitterTimelineContentProvider(context);
        this.webviewController = new WebViewController(context, this.contentProvider, view);
    }

    private openTimelineOfType(type: timeline.TimelineType, param?: string) {
        console.log('Opening timeline ' + type);
        var uri = this.contentProvider.getUri(type, param == null ? null : querystring.escape(param));
        this.webviewController.openTimeline('Opening timeline ' + type + ' ...', uri);
    }

    private registerCommand(command: string) {
        const self = this;
        this.extensionContext.subscriptions.push(vscode.commands.registerCommand(command, () => {
            self.event.emit(command);
        }));
    }

    private twitterSearchInternal() {
        const self = this;
        this.view.showSearchInputBox().then(value => {
            if (value) {
                self.webviewController.openSearchTimeline(value);
            }
        });
    }

    private onTwitterSearch() {
        Wizard.checkConfigurationAndRun(() => { this.twitterSearchInternal(); });
    }

    private twitterPostInternal() {
        this.view.showPostInputBox().then(value => {
            if (value) {
                console.log("Posting... " + value);
                vscode.window.setStatusBarMessage('Posting status...',
                    TwitterClient.post(value).then(() => {
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
        TwitterClient.getTrends().then(trend => {
            vscode.window.showQuickPick(trend, { matchOnDescription: true, placeHolder: 'Select a Trend' }).then(value => {
                if (value) {
                    self.webviewController.openSearchTimeline(decodeURIComponent(value.query));
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
        this.openTimelineOfType(timeline.TimelineType.Home, null);
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
                    case timeline.TimelineType.Home:
                    case timeline.TimelineType.User:
                    case timeline.TimelineType.Mentions:
                        self.openTimelineOfType(v.type, null);
                        break;
                    case timeline.TimelineType.Search:
                        self.twitterSearchInternal();
                        break;
                    case timeline.TimelineType.Post:
                        self.twitterPostInternal();
                        break;
                    case timeline.TimelineType.Trend:
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

        this.registerCommand(MainController.CmdStart);
        this.registerCommand(MainController.CmdPost);
        this.registerCommand(MainController.CmdSelect);
        this.registerCommand(MainController.CmdSearch);
        this.registerCommand(MainController.CmdWizard);
        this.registerCommand(MainController.CmdTrend);
        
        this.contentProvider.addHandler('twitter/timeline/home', timeline.TimelineType.Home);
        this.contentProvider.addHandler('twitter/timeline/user', timeline.TimelineType.User);
        this.contentProvider.addHandler('twitter/timeline/mentions', timeline.TimelineType.Mentions);
        this.contentProvider.addHandler('twitter/timeline/otheruser', timeline.TimelineType.OtherUser);
        this.contentProvider.addHandler('twitter/timeline/search', timeline.TimelineType.Search);
        this.contentProvider.addHandler('twitter/image', timeline.TimelineType.Image);
        vscode.workspace.registerTextDocumentContentProvider(TwitterTimelineContentProvider.schema, this.contentProvider);

        this.event.on(MainController.CmdStart, () => { self.onTwitterStart(); });
        this.event.on(MainController.CmdPost, () => { self.onTwitterPost(); });
        this.event.on(MainController.CmdSelect, () => { self.onTwitterTimeline(); });
        this.event.on(MainController.CmdSearch, () => { self.onTwitterSearch(); });
        this.event.on(MainController.CmdWizard, () => { self.onTwitterWizard(); });
        this.event.on(MainController.CmdTrend, () => { self.onTwitterTrend(); });

        this.view.activate();
    }

    deactivate() {
        console.log('Twitter deactivated!');
    }

    dispose() {
        this.deactivate();
        this.webviewController.dispose();
        this.view.dispose();
    }
}