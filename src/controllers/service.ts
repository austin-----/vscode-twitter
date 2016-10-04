import TwitterClient from '../twitter';
import MainController from './controller';
import * as vscode from 'vscode';

export enum LocalServiceEndpoint {
    User = 1,
    Search,
    Image,
    Refresh,
    Reply,
    Retweet,
    Like,
    Unlike,
    Follow,
    Unfollow,
    Css
}

export class LocalService {
    private app: any = require('express')();
    private segments: string[] = [];
    private types: LocalServiceEndpoint[] = [];
    
    servicePort: string;
    
    addHandler(segment: string, type: LocalServiceEndpoint, handler: (req, res)=>void) {
        this.app.get(segment, handler);
        this.segments.push(segment);
        this.types.push(type);
    }
    
    start() {
        const port = this.app.listen(0).address().port;
        console.log('Local service listening on port ' + port);
        this.servicePort = port.toString();
    }
    
    getSegment(type: LocalServiceEndpoint): string {
        var index = this.types.findIndex((value) => value == type);
        if (index != null) {
            var segment = this.segments[index];
            if (segment != null) {
                var parts = segment.split('/');
                if (parts.length > 1) {
                    return parts[1];
                }
            }
        }
        return null;
    }
}