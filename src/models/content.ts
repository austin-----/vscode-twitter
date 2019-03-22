import * as vscode from 'vscode';
import * as timeline from './timeline';
import * as querystring from 'querystring';
import WebView from '../views/webview';

export default class TwitterTimelineContentProvider implements vscode.TextDocumentContentProvider {

    private segments: string[] = [];
    private types: timeline.TimelineType[] = [];
    static schema: string = 'twitter';
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    provideTextDocumentContent(uri: vscode.Uri): Thenable<string> {
        console.log('Ask for content: ' + uri.toString());
        const self = this;
        const getNew = uri.fragment != 'false';
        var index = this.segments.findIndex((value) => (uri.authority + uri.path).startsWith(value));
        if (index != null) {
            var type = this.types[index];
            if (type != null) {
                if (type == timeline.TimelineType.Image) {
	                return Promise.resolve('<img src="' + querystring.unescape(uri.query) + '"/>');
                } else {
                    var tl = timeline.TimelineFactory.getTimeline(type, uri.query);
                    if (tl != null) {
                        return tl.getData().then(data => { return WebView.GetWebViewContent(self.context, type, data); });
                    }
                }
            }
        }
        return Promise.resolve('Invalid uri ' + uri.toString());
    }

    addHandler(segment: string, type: timeline.TimelineType) {
        this.segments.push(segment);
        this.types.push(type);
    }

    getUri(type: timeline.TimelineType, query?: string) {
        var index = this.types.findIndex((value) => value == type);
        if (index != null) {
            var segment = this.segments[index];
            if (segment != null) {
                const q = query == null ? '' : '/' + query + '?' + query;
                const uri = TwitterTimelineContentProvider.schema + '://' + segment + q;
                console.log('getUri: ' + uri);
                return vscode.Uri.parse(uri);
            }
        }
        return null;
    }
}