import * as ejs from 'ejs';
import * as vscode from 'vscode';
import {TimelineType} from '../models/timeline';
var moment = require('moment');
var uniqid = require('uniqid');

export default class WebView {
    private static get noMedia(): boolean {
        var configuration = vscode.workspace.getConfiguration('twitter');
        return configuration.get('nomedia', false);
    }

    static GetWebViewContent(context: vscode.ExtensionContext, type: TimelineType, data: any): Thenable<string> {
        return WebView.RenderWebContent(context, 'dist/views/timeline.ejs', data);
    }

    static GetRetweetLink(context: vscode.ExtensionContext, data: any): Thenable<string> {
        return WebView.RenderWebContent(context, 'dist/views/retweetlink.ejs', data);
    }

    static GetLikeLink(context: vscode.ExtensionContext, data: any): Thenable<string> {
        return WebView.RenderWebContent(context, 'dist/views/likelink.ejs', data);
    }

    static GetFollowLink(context: vscode.ExtensionContext, data: any): Thenable<string> {
        return WebView.RenderWebContent(context, 'dist/views/followlink.ejs', data);
    }

    private static RenderWebContent(context: vscode.ExtensionContext, path: string, data: any): Thenable<string> {
        data.moment = moment;
        data.uniqid = uniqid;
        data.nomedia = WebView.noMedia;
        return ejs.renderFile(context.asAbsolutePath(path), data);
    }
}