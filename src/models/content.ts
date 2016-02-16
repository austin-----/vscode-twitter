import * as vscode from 'vscode';
import * as timeline from './timeline';
import * as querystring from 'querystring';

export default class TwitterTimelineContentProvider implements vscode.TextDocumentContentProvider {

    private segments: string[] = [];
    private types: timeline.TimelineType[] = [];
    static schema: string = 'twitter';
    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();

    provideTextDocumentContent(uri: vscode.Uri): Thenable<string> {
        console.log('Ask for content: ' + uri.toString());
        var index = this.segments.findIndex((value) => (uri.authority + uri.path).startsWith(value));
        if (index != null) {
            var type = this.types[index];
            if (type != null) {
                if (type == timeline.TimelineType.Image) {
	                return Promise.resolve('<img src="' + querystring.unescape(uri.query) + '"/>');
                } else {
                    var tl = timeline.TimelineFactory.getTimeline(type, uri.query);
                    if (tl != null) {
                        return tl.getHTML();
                    }
                }
            }
        }
        return Promise.resolve('Invalid uri ' + uri.toString());
    }

    get onDidChange(): vscode.Event<vscode.Uri> {
        return this._onDidChange.event;
    }

    public update(uri: vscode.Uri) {
        this._onDidChange.fire(uri);
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
                return vscode.Uri.parse(TwitterTimelineContentProvider.schema + '://' + segment + q);
            }
        }
        return null;
    }
}