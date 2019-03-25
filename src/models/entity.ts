import * as punycode from 'punycode';

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
    
    processText(text: string, displayRange: [number, number] = [0, text.length]): [EntityType, any][] {
        var normalized: number[] = <any>punycode.ucs2.decode(text);

        var indexArray: any[] = [];
		
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
        var last = displayRange[0];
        indexArray.forEach((value, index, array) => {
            if (value.i0 > normalized.length || value.i0 < displayRange[0] || value.i1 > displayRange[1])return;

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

        var trailingText = punycode.ucs2.encode(normalized.slice(last, displayRange[1]));
        if (trailingText.length > 0) {
            result.push([EntityType.Text, {text: trailingText}]);
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
}