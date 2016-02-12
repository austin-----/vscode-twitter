import * as events from 'events';
import * as vscode from 'vscode';
import TwitterClient from '../twitter';
import Wizard from '../wizard';
import View from '../views/view';
import Tweet from '../models/tweet';
import * as timeline from '../models/timeline';
import TwitterTimelineContentProvider from '../models/content';
import * as querystring from 'querystring';

export default class MainController implements vscode.Disposable {
    private extensionContext: vscode.ExtensionContext;
    private event: events.EventEmitter = new events.EventEmitter();
    private view: View;
    private contentProvider: TwitterTimelineContentProvider = new TwitterTimelineContentProvider();

    static CmdStart: string = 'twitter.start';
    static CmdPost: string = 'twitter.post';
    static CmdSelect: string = 'twitter.select';
    static CmdSearch: string = 'twitter.search';
    static CmdWizard: string = 'twitter.wizard';
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

    private openTimeline(message: string, uri: vscode.Uri, newWindow = false) {
        const self = this;
        var viewColumn = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : (newWindow ? vscode.ViewColumn.Three : null);
        if (vscode.window.activeTextEditor) {
            viewColumn = (viewColumn) % 3 + 1;
        }
        vscode.window.setStatusBarMessage(message,
            vscode.commands.executeCommand('vscode.previewHtml', uri, viewColumn).then((success) => { },
                (reason) => {
                    vscode.window.showErrorMessage(reason);
                })
        );
    }
    
    private openTimelineOfType(type: timeline.TimelineType, param?: string) {
        console.log('Opening timeline ' + timeline.TimelineType[type]);
        var uri = this.contentProvider.getUri(type, param == null ? null : querystring.escape(param));
        this.openTimeline('Opening timeline ' + timeline.TimelineType[type] + ' ...', uri);
    }

    private openSearchTimeline(value: string) {
        console.log('Searching for ' + value);
        var uri = this.contentProvider.getUri(timeline.TimelineType.Search, querystring.escape(value));
        this.openTimeline('Searching for ' + value + ' ...', uri);
    }

    private openOtherUserTimeline(value: string) {
        console.log('Searching for @' + value);
        var uri = this.contentProvider.getUri(timeline.TimelineType.OtherUser, querystring.escape(value));
        this.openTimeline('Searching for @' + value + ' ...', uri);
    }

    private openImage(url: string) {
        console.log('Opening image ' + url);
        const uri = this.contentProvider.getUri(timeline.TimelineType.Image, querystring.escape(url));
        this.openTimeline('Opening image ' + url + ' ...', uri, true);
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
                    TwitterClient.post(value).then(result => {
                        vscode.window.showInformationMessage('Your status was posted.');
                    }, (error) => {
                        vscode.window.showErrorMessage('Failed to post the status: ' + error);
                    })
                );
            }
        });
    }

    private twitterReplyInternal(id: string, user: string) {
        this.view.showReplyInputBox(user).then(content => {
            if (content) {
                console.log("Replying... " + content);
                vscode.window.setStatusBarMessage('Replying status...',
                    TwitterClient.reply(content, id).then(result => {
                        vscode.window.showInformationMessage('Your reply was posted.');
                    }, (error) => {
                        vscode.window.showErrorMessage('Failed to reply: ' + error);
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
                    self.openSearchTimeline(decodeURIComponent(value.query));
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
        this.openTimelineOfType(timeline.TimelineType.Home);
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
                        self.openTimelineOfType(v.type);
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

    private app: any = require('express')();

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

        //this.extensionContext.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((editor) => { self.onEditorChange(editor); }));
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
        this.app.get('/refresh/:type/:query', function(req, res) {
            res.send('Refreshing');
            self.contentProvider.update(self.contentProvider.getUri(parseInt(req.params.type), req.params.query));
            self.openTimelineOfType(parseInt(req.params.type), req.params.query);
        });
        this.app.get('/refresh/:type', function(req, res) {
            res.send('Refreshing');
            self.contentProvider.update(self.contentProvider.getUri(parseInt(req.params.type)));
            self.openTimelineOfType(parseInt(req.params.type));
        });
        this.app.get('/reply/:id/:user', function(req, res) {
            res.send('');
            self.twitterReplyInternal(req.params.id, req.params.user);
        });
        this.app.get('/retweet/:id/:url/:brief', function(req, res) {
            vscode.window.showInformationMessage('Would you like to Retweet or Comment?', 'Comment', 'Retweet').then(select => {
                if (select == 'Retweet') {
                    TwitterClient.retweet(req.params.id).then(content => {
                        res.send(content);
                    }, (error: string) => {
                        vscode.window.showErrorMessage('Failed to retweet: ' + error);
                        res.send('');
                    });
                } else {
                    res.send('');
                    if (select == 'Comment') {
                        const url = querystring.unescape(req.params.url);
                        const brief = querystring.unescape(req.params.brief);
                        self.view.showCommentInputBox(brief + '...').then(content => {
                            if (content) {
                                TwitterClient.post(content + ' ' + url).then(content => {
                                    vscode.window.showInformationMessage('Your comment was posted.');
                                }, (error: string) => {
                                    vscode.window.showErrorMessage('Failed to post comment: ' + error);
                                });
                            }
                        });
                    }
                }
            });
        });
        this.app.get('/like/:id', function(req, res) {
            TwitterClient.like(req.params.id, false).then(content => {
                res.send(content);
            }, (error: string) => {
                vscode.window.showErrorMessage('Failed to like: ' + error);
            });
        });
        this.app.get('/unlike/:id', function(req, res) {
            TwitterClient.like(req.params.id, true).then(content => {
                res.send(content);
            }, (error: string) => {
                vscode.window.showErrorMessage('Failed to unlike: ' + error);
            });
        });

        var configuration = vscode.workspace.getConfiguration('twitter');
        var port = configuration.get<number>('localServicePort')
        try {
            const port = this.app.listen(0).address().port;
            console.log('Local service listening on port ' + port);
            Tweet.servicePort = port.toString();
        } catch (error) {
            vscode.window.showErrorMessage('Twitter local service failed to listen on port ' + port);
        }
    }

    deactivate() {
        console.log('Twitter deactivated!');
    }

    dispose() {
        this.deactivate();
        this.view.dispose();
    }
}