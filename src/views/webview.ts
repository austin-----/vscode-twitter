import * as ejs from 'ejs';
import * as vscode from 'vscode';
import {TimelineType} from '../models/timeline';
var moment = require('moment');

export default class WebView {
    static GetWebViewContent(context: vscode.ExtensionContext, type: TimelineType, data: any): Thenable<string> {
        data.moment = moment;
        return ejs.renderFile(context.asAbsolutePath('out/src/views/timeline.ejs'), data);
    }
}