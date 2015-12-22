import * as events from 'events';
import * as vscode from 'vscode'
import {TimelineFactory, TimelineType, Timeline} from './twitter';
import Wizard from './wizard';
import View from './view';
import {Document, WindowBehavior} from './document';
import Tweet from './tweet';
import * as querystring from 'querystring';

export default class Controller implements vscode.Disposable {
    private extensionContext: vscode.ExtensionContext;
    private event: events.EventEmitter = new events.EventEmitter();
    private view: View;

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

    private onEditorChange(editor: vscode.TextEditor) {
        if (editor) {
            console.log('editor changed: ' + editor.document.fileName);
            if (TimelineFactory.isTwitterBuffer(editor.document)) {
                console.log('it is a twitter buffer file');
                Document.fixDocument(editor.document.fileName, () => {
                    console.log('toggle preview');
                    // a hack to force the preview window to refresh its content
                    vscode.commands.executeCommand('workbench.action.markdown.togglePreview');
                    vscode.commands.executeCommand('workbench.action.markdown.togglePreview');
                    vscode.commands.executeCommand('workbench.action.markdown.togglePreview');
                });
            }
        }
    }

    private openTimeline(message: string, timeline: Timeline, newWindow: boolean) {
        const self = this;
        vscode.window.setStatusBarMessage(message,
            timeline.getNew().then((content) => {
                Document.openDocument(timeline.filename, content, newWindow ? WindowBehavior.ColumnTwo : WindowBehavior.ColumnOne);
            }, (error: string) => {
                vscode.window.showErrorMessage('Failed to retrieve timeline: ' + error);
            })
        );
    }

    private openSearchTimeline(value: string) {
        console.log('Searching for ' + value);
        const timeline = TimelineFactory.getSearchTimeline(value);
        this.openTimeline('Searching for ' + value + ' ...', timeline, false);
    }

    private openOtherUserTimeline(value: string) {
        console.log('Searching for @' + value);
        const timeline = TimelineFactory.getOtherUserTimeline(value);
        this.openTimeline('Searching for @' + value + ' ...', timeline, false);
    }

    private openImage(url: string) {
        console.log('Opening image ' + url);
        const timeline = TimelineFactory.getImageView(url);
        this.openTimeline('Opening image ' + url + ' ...', timeline, true);
    }

    private openTimelineOfType(type: TimelineType) {
        const timeline = TimelineFactory.getTimeline(type);
        this.openTimeline('Refreshing timeline...', timeline, false);
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

    private twitterReplyInternal(id: string, user: string) {
        this.view.showReplyInputBox(user).then(content => {
            if (content) {
                console.log("Replying... " + content);
                vscode.window.setStatusBarMessage('Replying status...',
                    TimelineFactory.getTimeline(TimelineType.Home).reply(content, id).then(result => {
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
        this.openTimelineOfType(TimelineType.Home);
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
                        self.openTimelineOfType(v.type);
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
        this.registerCommand(Controller.CmdTrend);

        this.event.on(Controller.CmdStart, () => { self.onTwitterStart(); });
        this.event.on(Controller.CmdPost, () => { self.onTwitterPost(); });
        this.event.on(Controller.CmdSelect, () => { self.onTwitterTimeline(); });
        this.event.on(Controller.CmdSearch, () => { self.onTwitterSearch(); });
        this.event.on(Controller.CmdWizard, () => { self.onTwitterWizard(); });
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
            const signature = querystring.unescape(req.params.signature);
            const timeline = TimelineFactory.getTimelineBySignature('#' + signature);
            timeline.getNew().then((content) => {
                Document.openDocument(timeline.filename, content, WindowBehavior.CurrentWindow);
            }, (error: string) => {
                vscode.window.showErrorMessage('Failed to retrieve timeline: ' + error);
            })
        });
        this.app.get('/reply/:id/:user', function(req, res) {
            res.send('');
            self.twitterReplyInternal(req.params.id, req.params.user);
        });
        this.app.get('/retweet/:id/:url/:brief', function(req, res) {
            vscode.window.showInformationMessage('Would you like to Retweet or Comment?', 'Comment', 'Retweet').then(select => {
                if (select == 'Retweet') {
                    TimelineFactory.getTimeline(TimelineType.Home).retweet(req.params.id).then(content => {
                        res.send(content);
                    }, (error: string) => {
                        vscode.window.showErrorMessage('Failed to retweet: ' + error);
                        res.send('');
                    });
                } else {
                    res.send('');
                    if (select == 'Comment') {
                        const url = decodeURIComponent(req.params.url);
                        const brief = decodeURIComponent(req.params.brief);
                        self.view.showCommentInputBox(brief + '...').then(content => {
                            if (content) {
                                TimelineFactory.getTimeline(TimelineType.Home).post(content + ' ' + url).then(content => {
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
            TimelineFactory.getTimeline(TimelineType.Home).like(req.params.id, false).then(content => {
                res.send(content);
            }, (error: string) => {
                vscode.window.showErrorMessage('Failed to like: ' + error);
            });
        });
        this.app.get('/unlike/:id', function(req, res) {
            TimelineFactory.getTimeline(TimelineType.Home).like(req.params.id, true).then(content => {
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
        if (vscode.window.activeTextEditor == null) {
            vscode.commands.executeCommand('workbench.action.markdown.togglePreview');
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