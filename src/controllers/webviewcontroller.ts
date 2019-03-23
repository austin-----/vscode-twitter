import * as vscode from 'vscode';
import * as querystring from 'querystring';
import TwitterTimelineContentProvider from '../models/content';
import TwitterClient from '../twitter';
import * as timeline from '../models/timeline';
import View from '../views/view';
import WebView from '../views/webview';

export enum WebViewCommand {
    User = 'user',
    Search = 'search',
    Image = 'image',
    Refresh = 'refresh',
    Reply = 'reply',
    Retweet = 'retweet',
    Like = 'like',
    Unlike = 'unlike',
    Follow = 'follow',
    Unfollow = 'unfollow'
}

export class WebViewController implements vscode.Disposable {
    private extensionContext: vscode.ExtensionContext;
    private webViews = {};
    private contentProvider: TwitterTimelineContentProvider;
    private view: View;

    constructor(extensionContext: vscode.ExtensionContext, contentProvider: TwitterTimelineContentProvider, view: View) {
        this.extensionContext = extensionContext;
        this.contentProvider = contentProvider;
        this.view = view;
    }

    private refreshWebViewPanel (uri: vscode.Uri, loadNew: boolean): Thenable<void> {
        var uri2 = uri.with({fragment: loadNew ? '' : 'false'});
        return this.getWebViewPanel(uri).then(panel => {
            this.contentProvider.provideTextDocumentContent(uri2).then(html => {
                panel.webview.html = html;
            })
        });
    }

    private getWebViewPanel (uri: vscode.Uri) : Thenable<vscode.WebviewPanel> {

        if (this.webViews[uri.toString()] != null) {
            return new Promise((resolve) => {
                resolve(this.webViews[uri.toString()]);
            });
        }

        return this.contentProvider.provideTextDocumentContent(uri).then(html => {
            var panel = vscode.window.createWebviewPanel(
                'twitter',
                uri.fsPath.substr(0, 30),
                { 
                    viewColumn: vscode.ViewColumn.Beside,
                    preserveFocus: true
                },
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    enableFindWidget: true
                }
            );

            this.webViews[uri.toString()] = panel;

            panel.webview.html = html;

            panel.webview.onDidReceiveMessage(msg => {
                this.onCommand(msg.cmd, msg.args, uri, panel.webview);
            }, this);

            panel.onDidDispose(
                () => {
                    this.webViews[uri.toString()] = undefined;
                },
                this);

            return panel;
        }, error => {console.log(error)});
    }

    openTimeline(message: string, uri: vscode.Uri) {
        vscode.window.setStatusBarMessage(message, 
            this.getWebViewPanel(uri).then(v => { v.reveal(vscode.ViewColumn.Beside, true) })
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

    onCommand(command: string, args, uri: vscode.Uri, webview: vscode.Webview) {
        switch (command) {
            case WebViewCommand.User:
                this.onCmdUser(args.screenName);
            break;
            case WebViewCommand.Search:
                this.onCmdSearch(args.value);
            break;
            case WebViewCommand.Refresh:
                this.onCmdRefresh(uri, args.loadNew);
            break;
            case WebViewCommand.Reply:
                this.onCmdReply(args.id, args.user);
            break;
            case WebViewCommand.Retweet:
                this.onCmdRetweet(args.id, args.url, args.brief, webview, args.hid);
            break;
            case WebViewCommand.Like:
                this.onCmdLike(args.id, false, webview, args.hid);
            break;
            case WebViewCommand.Unlike:
                this.onCmdLike(args.id, true, webview, args.hid);
            break;
            case WebViewCommand.Follow:
                this.onCmdFollow(args.screenName, false, webview, args.hid);
            break;
            case WebViewCommand.Unfollow:
                this.onCmdFollow(args.screenName, true, webview, args.hid);
            break;
            case WebViewCommand.Image:
                this.openImage(args.src);
            break;
            default:
                console.log('Error: unknown command :' + command );
        }
    }

    private onCmdUser(screenName: string) {
        this.openOtherUserTimeline(screenName);
    }

    private onCmdSearch(value: string) {
        this.openSearchTimeline(value);
    }

    private onCmdRefresh(uri: vscode.Uri, loadNew: boolean) {
        vscode.window.setStatusBarMessage('Loading ' + loadNew ? 'new ' : 'old ' + ' tweets', 
            this.refreshWebViewPanel(uri, loadNew));
    }

    private onCmdReply(id: string, user: string) {	
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

    private onCmdRetweet(id: string, url: string, brief: string, webview: vscode.Webview, hid: string) {
        vscode.window.showInformationMessage('Would you like to Retweet or Comment?', 'Comment', 'Retweet').then(select => {
            if (select == 'Retweet') {
                TwitterClient.retweet(id).then(tweet => {
                    vscode.window.showInformationMessage('Your retweet was posted.');
                    WebView.GetRetweetLink(this.extensionContext, {tweet}).then(html => {
                        return webview.postMessage({hid, html})
                    }, error => {console.log(error);});
                }, (error: string) => {
                    vscode.window.showErrorMessage('Failed to retweet: ' + error);
                });
            } else if (select == 'Comment') {
                this.view.showCommentInputBox(brief + '...').then(content => {
                    if (content) {
                        TwitterClient.post(content + ' ' + url).then(() => {
                            vscode.window.showInformationMessage('Your comment was posted.');
                        }, (error: string) => {
                            vscode.window.showErrorMessage('Failed to post comment: ' + error);
                        });
                    }
                });
            }
        });
    }

    private onCmdLike(id: string, unlike: boolean, webview: vscode.Webview, hid: string) {
        TwitterClient.like(id, unlike).then(tweet => {
            WebView.GetLikeLink(this.extensionContext, {tweet}).then(html => {
                return webview.postMessage({hid, html})
            }, error => {console.log(error);});
        }, (error: string) => {
            vscode.window.showErrorMessage('Failed to ' + (unlike ? 'unlike' : 'like') + ': ' + error);
        });
    }

    private onCmdFollow(screenName: string, unfollow: boolean, webview: vscode.Webview, hid: string) {
        TwitterClient.follow(screenName, unfollow).then(user => {
            WebView.GetFollowLink(this.extensionContext, {user}).then(html => {
                return webview.postMessage({hid, html})
            }, error => {console.log(error);});
        }, (error: string) => {
            vscode.window.showErrorMessage('Failed to ' + (unfollow ? 'unfollow' : 'follow') + ': ' + error);
        });
    }

    dispose() {
        for(var uri in this.webViews) {
            if (this.webViews[uri] != null) {
                (<vscode.WebviewPanel>this.webViews[uri]).dispose();
            }
        }
    }
}