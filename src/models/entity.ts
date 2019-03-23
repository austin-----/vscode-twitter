import * as punycode from 'punycode';
import * as vscode from 'vscode';

export enum EntityType {
    Text = 'text',
    UserMention = 'userMention',
    HashTag = 'hashTag',
    Symbol = 'symbol',
    Url = 'url'
}

export interface Handler {
    (token:string, value:string) : string;
}

export enum TrailingUrlBehavior {
    NoChange = 1,
    Remove,
    Urlify
}

export class Entity {
    media: any[];
    userMentions: any[];
    hashTags: any[];
    symbols: any[];
    urls: any[];
    static urlReg = /(.*\b)(https\:\/\/t\.co\/[0-9a-zA-Z]+)$/;
    
    processText(text: string, trailingUrlBehavior: TrailingUrlBehavior): [EntityType, any][] {
        var normalized: number[] = <any>punycode.ucs2.decode(text);

        var indexArray: any[] = [];
		
        // user mentions
        if (this.userMentions) {
            indexArray = indexArray.concat(this.userMentions.map(u => { return { type: EntityType.UserMention, i0: u.indices[0], i1: u.indices[1], tag: u }; }));
        }

        if (this.hashTags) {
            indexArray = indexArray.concat(this.hashTags.map(u => { return { type: EntityType.HashTag, i0: u.indices[0], i1: u.indices[1], tag: u }; }));
        }

        if (this.symbols) {
            indexArray = indexArray.concat(this.symbols.map(u => { return { type: EntityType.Symbol, i0: u.indices[0], i1: u.indices[1], tag: u }; }));
        }

        if (this.urls) {
            indexArray = indexArray.concat(this.urls.map(u => { return { type: EntityType.Url, i0: u.indices[0], i1: u.indices[1], tag: u }; }));
        }

        indexArray.sort((a, b) => { return a.i0 - b.i0; });

        var result = [];
        var last = 0;
        indexArray.forEach((value, index, array) => {
            if (value.i0 > last) {
                result.push([EntityType.Text, {text: punycode.ucs2.encode(normalized.slice(last, value.i0))}]);
            }
             
            var token = punycode.ucs2.encode(normalized.slice(value.i0, value.i1));
            switch (value.type) {
                case EntityType.UserMention:
                    result.push([value.type, {text: token, name: value.tag.screen_name}]);
                    break;
                case EntityType.HashTag:
                    result.push([value.type, {text: token, tag: value.tag.text}]);
                    break;
                case EntityType.Symbol:
                    result.push([value.type, {text: token, symbol: value.tag.text}]);
                    break;
                case EntityType.Url:
                    result.push([value.type, {text: value.tag.display_url, url: value.tag.url}]);
                    break;
            }
            
            last = value.i1;
        });

        var trailingText = punycode.ucs2.encode(normalized.slice(last));
        if (trailingText.length > 0) {
            if (trailingUrlBehavior != TrailingUrlBehavior.NoChange) {
                var parts = trailingText.match(Entity.urlReg);
                if (parts != null && parts.length == 3) {
                    result.push([EntityType.Text, {text: parts[1]}]);
                    if (trailingUrlBehavior != TrailingUrlBehavior.Remove) {
                        result.push([EntityType.Url, {text: parts[2], url: parts[2]}]);
                    }
                } else {
                    result.push([EntityType.Text, {text: trailingText}]);
                }
            } else {
                result.push([EntityType.Text, {text: trailingText}]);
            }
        }
        
        return result;
    }
    
    static fromJson(entityJson: any, extendedEntityJson: any): Entity {
        var entity = new Entity();
        if (entityJson) {
            if (entityJson.user_mentions) {
                entity.userMentions = entityJson.user_mentions;
            }
            if (entityJson.hashtags) {
                entity.hashTags = entityJson.hashtags;
            }
            if (entityJson.symbols) {
                entity.symbols = entityJson.symbols;
            }
            if (entityJson.urls) {
                entity.urls = entityJson.urls;
            }
            if (extendedEntityJson) {
                if (extendedEntityJson.media) {
                    entity.media = extendedEntityJson.media;
            	}
            }
        }
        return entity;
    }

    static get noMedia(): boolean {
        var configuration = vscode.workspace.getConfiguration('twitter');
        return configuration.get('nomedia', false);
    }
}