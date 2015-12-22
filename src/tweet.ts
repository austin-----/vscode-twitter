var moment = require('moment');
import * as punycode from 'punycode';
import * as vscode from 'vscode';
import * as querystring from 'querystring';

enum EntityType {
    UserMention = 1,
    HashTag,
    Symbol,
    Url
}

export default class Tweet {
    id: string;
    text: string;
    userId: string;
    userName: string;
    userScreenName: string;
    userImage: string;
    created: string;
    quoted: Tweet;
    media: any[];
    userMentions: any[];
    hashTags: any[];
    symbols: any[];
    urls: any[];
    retweeted_status: Tweet;
    retweetCount: number;
    retweeted: boolean;
    likeCount: number;
    liked: boolean;

    static lineFeed: string = '\r\n\r\n';
    static endLine: string = '_____' + Tweet.lineFeed;
    static quote: string = '>';
    static dotSeparator: string = ' \u2022 ';
    static spaceSeparator: string = '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
    static retweetSymbol: string = '\u267A';
    static greenretweetSymbol: string = '<font color="green">\u267A</font>';
    static refreshSymbol: string = '\u21BB';
    static heartSymbol: string = '\u2661';
    static redHeartSymbol: string = '<font color="red">\u2661</font>';
    static replySymbol: string = 'Reply';
    static underscoreAlter: string = '&lowbar;';
    static autoplayControl = ' autoplay loop ';
    static videoControl = ' muted controls preload="none" ';

    static fixServicePort(content: string): string {
        return content.replace(/http\:\/\/localhost\:[0-9]+\//g, this.serviceUrl);
    }

    static servicePort: string;

    static get serviceUrl(): string {
        return 'http://localhost:' + this.servicePort + '/';
    }

    static get userLinkPrefix(): string {
        return this.serviceUrl + 'user/';
    }

    static get hashTagLinkPrefix(): string {
        return this.serviceUrl + 'search/%23';
    }

    static get searchPrefix(): string {
        return this.serviceUrl + 'search/';
    }

    static get imagePrefix(): string {
        return this.serviceUrl + 'image/';
    }
    
    static get retweetPrefix(): string {
        return this.serviceUrl + 'retweet/';
    }
    
    static get replyPrefix(): string {
        return this.serviceUrl + 'reply/';
    }

    get likePrefix(): string {
        return Tweet.serviceUrl + (this.liked ? 'unlike/' : 'like/');
    }

    static createReload(signature: string): string {
        return Tweet.createLink(Tweet.refreshSymbol, Tweet.serviceUrl + 'refresh/' + querystring.escape(signature));
    }

    tweetLink(): string {
        return 'https://twitter.com/' + this.userScreenName + '/status/' + this.id;
    }

    userLink(): string {
        return Tweet.userLinkPrefix + this.userScreenName;
    }

    likeLink(): string {
        return this.likePrefix + this.id;
    }
    
    retweetLink(): string {
        return (this.retweeted ? '' : Tweet.retweetPrefix + this.id + '/' + querystring.escape(this.tweetLink()) + '/' + querystring.escape('@' + this.userScreenName + ': ' + this.text.slice(0, 10)));
    }
    
    replyLink(): string {
        return Tweet.replyPrefix + this.id + '/' + this.userScreenName;
    }

    toMarkdown(level: number = 0): string {
        const quote = Tweet.quote.repeat(level);

        if (this.retweeted_status) {
            return this.formatUser(-1) + ' ' + 'Retweeted' + Tweet.lineFeed + this.retweeted_status.toMarkdown(level);
        }

        var result = quote + this.formatUser(level) + Tweet.lineFeed +
            quote + this.normalizeText(quote) + Tweet.lineFeed;
        if (this.quoted) {
            result += this.quoted.toMarkdown(level + 1);
        }

        if (this.media) {
            const size = (level == 0) ? ':small' : ':thumb';
            var mediaStr = this.media.map<string>((value, index, array): string => {
                var mediaStr = '';
                if (value.type == 'video' || value.type == 'animated_gif') {
                    const control = ((value.type == 'animated_gif') ? Tweet.autoplayControl : Tweet.videoControl);
                    const variants: any[] = value.video_info.variants;
                    if (variants.length != 0) {
                        mediaStr += '<video width="340" poster="' + value.media_url_https + '" ' + control + '>';
                        variants.forEach((video, index, array) => {
                            mediaStr += '<source src="' + video.url + '" type="' + video.content_type + '"/>';
                        });
                        mediaStr += '</video>';
                        return mediaStr;
                    }
                }
                // not video, use image
                //return '[![](' + value.media_url_https + size + ')](' + value.media_url_https + ':large)';
                return Tweet.createLink('![](' + value.media_url_https + size + ')', Tweet.imagePrefix + encodeURIComponent(value.media_url_https + ':large'));
            }).join(' ');
            if (mediaStr != '') {
                result += quote + mediaStr + Tweet.lineFeed;
            }
        }
        if (level == 0) result += this.formatStatusLine() + Tweet.endLine;
        return result;
    }

    formatStatusLine(): string {
        var result = Tweet.createLink(Tweet.replySymbol, this.replyLink());
        result += Tweet.spaceSeparator + this.formatRetweet();
        result += Tweet.spaceSeparator + this.formatLike();
        return result + Tweet.lineFeed;
    }
    
    formatRetweet(): string {
        var text = Tweet.retweetSymbol + (this.retweetCount == 0 ? '' : ' ' + this.retweetCount + ' ');
        if (this.retweeted) {
            text = '<font color="green">' + text + '</font>';
        }
        return (this.retweeted ? text : Tweet.createLink(text, this.retweetLink(), true));
    }

    formatLike(): string {
        var text = Tweet.heartSymbol + (this.likeCount == 0 ? '' : ' ' + this.likeCount + ' ');
        if (this.liked) {
            text = '<font color="red">' + text + '</font>';
        }
        return Tweet.createLink(text, this.likeLink(), true);
    }

    formatUser(level: number): string {
        var result = ''
        if (level == 0) {
            result += '![](' + this.userImage + ') ';
        }
        if (level == -1) {
            result += Tweet.retweetSymbol + ' ' + Tweet.createLink(this.userName, this.userLink());
        } else {
            result += Tweet.bold(this.userName) + ' ' + Tweet.createLink(Tweet.normalizeUnderscore('@' + this.userScreenName), this.userLink());
        }

        if (level == 0) {
            result += Tweet.dotSeparator + moment(this.created.replace(/( +)/, ' UTC$1')).fromNow();
        }
        if (level != -1) {
            result += ' ([Detail](' + this.tweetLink() + ')) ';
        }
        return result;
    }

    static createLink(text: string, url: string, replace: boolean = false): string {
        const replaceCallback = 'var self=this;xhttp.onreadystatechange=function(){if(xhttp.readyState==4){console.log(\'done\');if(xhttp.responseText!=\'\'){self.outerHTML=xhttp.responseText;}}};';
        return '<a onclick="console.log(\'clicked\');xhttp=new XMLHttpRequest();xhttp.open(\'GET\', \'' + url + '\', true);' + (replace ? replaceCallback : '') + 'xhttp.send();" >' + text + '</a>';
    }

    normalizeText(quote: string): string {
        var normalized: number[] = <any>punycode.ucs2.decode(this.text);

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
                    token = Tweet.createLink(Tweet.normalizeUnderscore(token), Tweet.userLinkPrefix + value.tag.screen_name);
                    break;
                case EntityType.HashTag:
                    token = Tweet.createLink(Tweet.normalizeUnderscore(token), Tweet.hashTagLinkPrefix + value.tag.text);
                    break;
                case EntityType.Symbol:
                    token = Tweet.createLink(token, Tweet.searchPrefix + '$' + value.tag.text);
                    break;
                case EntityType.Url:
                    token = '[' + token + '](' + value.tag.url + ')';
                    break;
            }
            processed += token;
            last = value.i1;
        });

        processed += punycode.ucs2.encode(normalized.slice(last));
        var result = processed;
        result = result.replace(/_/g, Tweet.underscoreAlter);
        result = result.replace(/^RT /, Tweet.bold('RT') + ' ');
        result = result.replace(/\n/g, '\n' + quote)
        return result;
    }

    constructor(id: string, created: string, text: string, userId: string, userName: string, userScreenName: string, userImage: string, retweetCount: number, retweeted: boolean, likeCount: number, liked: boolean) {
        this.id = id;
        this.created = created;
        this.text = text;
        this.userId = userId;
        this.userName = userName;
        this.userScreenName = userScreenName;
        this.userImage = userImage;
        this.retweetCount = retweetCount;
        this.retweeted = retweeted;
        this.likeCount = likeCount;
        this.liked = liked;
    }

    static normalizeUnderscore(text: string): string {
        return text.replace(/_/g, Tweet.underscoreAlter);
    }

    static bold(text: string): string {
        return '**' + text + '**';
    }

    static head1(text: string): string {
        return '#' + text + '\r\n\r\n';
    }

    static fromJson(json: any): Tweet {
        var tweet = new Tweet(json.id_str, json.created_at, json.text, json.user.id_str, json.user.name, json.user.screen_name, json.user.profile_image_url_https, json.retweet_count, json.retweeted, json.favorite_count, json.favorited);
        if (json.quoted_status) {
            tweet.quoted = Tweet.fromJson(json.quoted_status);
        }

        if (json.retweeted_status) {
            tweet.retweeted_status = Tweet.fromJson(json.retweeted_status);
        }

        var entities = json.entities;
        if (entities) {
            if (entities.user_mentions) {
                tweet.userMentions = entities.user_mentions;
            }
            if (entities.hashtags) {
                tweet.hashTags = entities.hashtags;
            }
            if (entities.symbols) {
                tweet.symbols = entities.symbols;
            }
            if (entities.urls) {
                tweet.urls = entities.urls;
            }
            if (json.extended_entities) {
                entities = json.extended_entities;
            }
            if (entities.media) {
                tweet.media = entities.media;
            }
        }

        return tweet;
    }
}