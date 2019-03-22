import * as vscode from 'vscode';
import * as querystring from 'querystring';
import TwitterTimelineContentProvider from '../models/content';
import * as timeline from '../models/timeline';
import View from '../views/view';

export enum WebViewCommand {
    User = 'User',
    Search = 'Search',
    Image = 'Image',
    Refresh = 'Refresh',
    Reply = 'Reply',
    Retweet = 'Retweet',
    Like = 'Like',
    Unlike = 'Unlike',
    Follow = 'Follow',
    Unfollow = 'Unfollow'
}

export class WebViewController implements vscode.Disposable {

    private webViews = {};
    private contentProvider: TwitterTimelineContentProvider;
    private view: View;

    constructor(contentProvider: TwitterTimelineContentProvider, view: View) {
        this.contentProvider = contentProvider;
        this.view = view;
    }

    getWebViewPanel (uri: vscode.Uri) : Thenable<vscode.WebviewPanel> {

        if (this.webViews[uri.toString()] != null) {
            return new Promise((resolve) => {
                resolve(this.webViews[uri.toString()]);
            });
        }

        return vscode.workspace.openTextDocument(uri).then(doc => {
            var panel = vscode.window.createWebviewPanel(
                'twitter',
                doc.fileName,
                vscode.ViewColumn.Beside,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );

            this.webViews[uri.toString()] = panel;

            panel.webview.html = doc.getText();

            panel.webview.onDidReceiveMessage(msg => {
                this.onCommand(WebViewCommand[<string>msg.command], msg.args);
            }, this);

            panel.onDidDispose(
                () => {
                    this.webViews[uri.toString()] = undefined;
                },
                this);

            return panel;
        }, error => {
            console.log('Error: ' + error);
        });
    }

    openTimeline(message: string, uri: vscode.Uri) {
        vscode.window.setStatusBarMessage(message, 
            this.getWebViewPanel(uri).then(v => { v.reveal(vscode.ViewColumn.Beside) })
        );
    }

    openSearchTimeline(value: string) {
        console.log('Searching for ' + value);
        var uri = this.contentProvider.getUri(timeline.TimelineType.Search, querystring.escape(value));
        this.openTimeline('Searching for ' + value + ' ...', uri);
    }

    openOtherUserTimeline(value: string) {
        console.log('Searching for @' + value);
        var uri = this.contentProvider.getUri(timeline.TimelineType.OtherUser, querystring.escape(value));
        this.openTimeline('Searching for @' + value + ' ...', uri);
    }

    openImage(url: string) {
        console.log('Opening image ' + url);
        const uri = this.contentProvider.getUri(timeline.TimelineType.Image, querystring.escape(url));
        this.openTimeline('Opening image ' + url + ' ...', uri);
    }

    onCommand(command: WebViewCommand, args) {
        switch (command) {
            case WebViewCommand.User:
                this.onCmdUser(args.screenName);
            break;
        }
    }

    private onCmdUser(screenName: string) {
        this.openOtherUserTimeline(screenName);
    }

    /*
    this.service.addHandler('/search/:q', LocalServiceEndpoint.Search, function(req, res) {
        res.send('Searching for ' + req.params.q);
        self.openSearchTimeline(req.params.q);
    });
    
    this.service.addHandler('/user/:screen_name', LocalServiceEndpoint.User, function(req, res) {
        res.send('Searching for @' + req.params.screen_name);
        self.openOtherUserTimeline(req.params.screen_name);
    });
    
    this.service.addHandler('/image/:img', LocalServiceEndpoint.Image, function(req, res) {
        const image = decodeURIComponent(req.params.img);
        res.send('Opening image ' + image);
        self.openImage(image);
    });
    
    this.service.addHandler('/refresh/:getnew/:type/:query?', LocalServiceEndpoint.Refresh, function(req, res) {
        res.send('Refreshing ' + req.params.getnew);
        console.log('Refreshing ' + req.params.getnew);
        const type = parseInt(req.params.type);
        const uri = self.contentProvider.getUri(type, req.params.query == null ? null : querystring.escape(req.params.query));
        const tl = timeline.TimelineFactory.getTimeline(type, uri.query);
        tl.getNew = req.params.getnew != 'false';
        self.contentProvider.update(uri);
    });
    
    this.service.addHandler('/reply/:id/:user', LocalServiceEndpoint.Reply, function(req, res) {
        res.send('');
        self.twitterReplyInternal(req.params.id, req.params.user);
    });
    
    this.service.addHandler('/retweet/:id/:url/:brief', LocalServiceEndpoint.Retweet, function(req, res) {
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
                            TwitterClient.post(content + ' ' + url).then(() => {
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
    
    this.service.addHandler('/like/:id', LocalServiceEndpoint.Like, function(req, res) {
        TwitterClient.like(req.params.id, false).then(content => {
            res.send(content);
        }, (error: string) => {
            vscode.window.showErrorMessage('Failed to like: ' + error);
        });
    });
    
    this.service.addHandler('/unlike/:id', LocalServiceEndpoint.Unlike, function(req, res) {
        TwitterClient.like(req.params.id, true).then(content => {
            res.send(content);
        }, (error: string) => {
            vscode.window.showErrorMessage('Failed to unlike: ' + error);
        });
    });
    
    this.service.addHandler('/follow/:user', LocalServiceEndpoint.Follow, function(req, res) {
        TwitterClient.follow(req.params.user, false).then(content => {
            res.send(content);
        }, (error: string) => {
            vscode.window.showErrorMessage('Failed to follow: ' + error);
        });
    });
    
    this.service.addHandler('/unfollow/:user', LocalServiceEndpoint.Unfollow, function(req, res) {
        TwitterClient.follow(req.params.user, true).then(content => {
            res.send(content);
        }, (error: string) => {
            vscode.window.showErrorMessage('Failed to unfollow: ' + error);
        });
    });

    this.service.addHandler('/css', LocalServiceEndpoint.Css, function(req, res) {
        https.get('https://raw.githubusercontent.com/Microsoft/vscode/master/extensions/markdown/media/markdown.css', function(message) {
            var content = "";
            message.on('data', function(chunk){
                content += chunk;
            });
            message.on('end', function(){
                res.setHeader('Content-Type', 'text/css');
                res.send(content);
            });
            message.resume();
        });
    });
    */

    dispose() {
        
    }
}