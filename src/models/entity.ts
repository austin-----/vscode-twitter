import * as punycode from 'punycode';

enum EntityType {
    UserMention = 1,
    HashTag,
    Symbol,
    Url
}

export interface Handler {
    (token:string, value:string) : string;
}

export enum TrailingUrlBehavior {
    NoChange = 1,
    Remove,
    Urlify
}

export default class Entity {
    media: any[];
    userMentions: any[];
    hashTags: any[];
    symbols: any[];
    urls: any[];
    
    processText(text: string, trailingUrlBehavior: TrailingUrlBehavior, mentionHandler: Handler, hashTagHandler: Handler, symbolHandler: Handler, urlHandler: Handler): string {
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

        var processed = '';
        var last = 0;
        indexArray.forEach((value, index, array) => {
            processed += punycode.ucs2.encode(normalized.slice(last, value.i0));
            var token = punycode.ucs2.encode(normalized.slice(value.i0, value.i1));
            switch (value.type) {
                case EntityType.UserMention:
                    token = mentionHandler(token, value.tag.screen_name);
                    break;
                case EntityType.HashTag:
                    token = hashTagHandler(token, value.tag.text);
                    break;
                case EntityType.Symbol:
                    token = symbolHandler(token, '$' + value.tag.text);
                    break;
                case EntityType.Url:
                    token = urlHandler(value.tag.display_url, value.tag.url);
                    break;
            }
            processed += token;
            last = value.i1;
        });

        processed += punycode.ucs2.encode(normalized.slice(last));
        
        if (trailingUrlBehavior != TrailingUrlBehavior.NoChange) {
            if (this.media != null && this.media.length > 0) {
                processed = Entity.replaceTrailingUrl(processed, trailingUrlBehavior == TrailingUrlBehavior.Remove ? (url) => {return '';} : (url) => {return urlHandler(url, url);});
            }
        }
        
        var result = processed;
        return result;
    }
    
    static replaceTrailingUrl(content: string, replace: (string) => string): string {
        const urlReg = /\bhttps\:\/\/t\.co\/[0-9a-zA-Z]+$/;
        const trailingUrls = content.match(urlReg);
        if (trailingUrls != null && trailingUrls.length == 1) {
            const url = trailingUrls[0];
            content = content.replace(url, replace(url));
            return content;
        } else {
            return content;
        }
    }
    
    static fromJson(entityJson: any, extended_entityJson: any): Entity {
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
            if (extended_entityJson) {
                if (extended_entityJson.media) {
                    entity.media = extended_entityJson.media;
            	}
            }
        }
        return entity;
    }
}