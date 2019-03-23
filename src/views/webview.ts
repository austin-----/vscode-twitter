import * as ejs from 'ejs';
import * as vscode from 'vscode';
import {TimelineType} from '../models/timeline';
var moment = require('moment');
var uniqid = require('uniqid');

export default class WebView {
    static GetWebViewContent(context: vscode.ExtensionContext, type: TimelineType, data: any): Thenable<string> {
        return WebView.RenderWebContent(context, 'out/src/views/timeline.ejs', data);
    }

    static GetRetweetLink(context: vscode.ExtensionContext, data: any): Thenable<string> {
        return WebView.RenderWebContent(context, 'out/src/views/retweetlink.ejs', data);
    }

    static GetLikeLink(context: vscode.ExtensionContext, data: any): Thenable<string> {
        return WebView.RenderWebContent(context, 'out/src/views/likelink.ejs', data);
    }

    static GetFollowLink(context: vscode.ExtensionContext, data: any): Thenable<string> {
        return WebView.RenderWebContent(context, 'out/src/views/followlink.ejs', data);
    }

    private static RenderWebContent(context: vscode.ExtensionContext, path: string, data: any): Thenable<string> {
        data.moment = moment;
        data.uniqid = uniqid;
        return ejs.renderFile(context.asAbsolutePath(path), data);
    }
}