import Tweet from './tweet';
import User from './user';
import Entity from './entity';
import {TrailingUrlBehavior} from './entity';
import {TimelineType} from './timeline';
import {LocalService, LocalServiceEndpoint} from '../controllers/service';
import * as vscode from 'vscode';
import * as querystring from 'querystring';

var stringz = require('stringz');
var moment = require('moment');

export enum UserFormatPosition {
    Retweet = 1,
    Tweet,
    Quoted,
    Profile
}

export default class HTMLFormatter {

    static endLine: string = '<hr/>';
    static dotSeparator: string = ' \u2022 ';
    static spaceSeparator: string = '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
    static barSeparator: string = '&nbsp;&nbsp;|&nbsp;&nbsp;';
    static retweetSymbol: string = '\u267A';
    static refreshSymbol: string = '\u21BB';
    static heartSymbol: string = '\u2661';
    static replySymbol: string = 'Reply';
    static autoplayControl = ' autoplay loop ';
    static videoControl = ' muted controls preload="none" ';

    private static get noMedia(): boolean {
        var configuration = vscode.workspace.getConfiguration('twitter');
        return configuration.get('nomedia', false);
    }

    private static get autoPlay(): boolean {
        var configuration = vscode.workspace.getConfiguration('twitter');
        return configuration.get('autoPlay', true);
    }

    static service: LocalService;

    static get serviceUrl(): string {
        return 'http://localhost:' + this.service.servicePort + '/';
    }

    static get userLinkPrefix(): string {
        return this.serviceUrl + this.service.getSegment(LocalServiceEndpoint.User) + '/';
    }

    static get hashTagLinkPrefix(): string {
        return this.serviceUrl + this.service.getSegment(LocalServiceEndpoint.Search) + '/%23';
    }

    static get searchPrefix(): string {
        return this.serviceUrl + this.service.getSegment(LocalServiceEndpoint.Search) + '/';
    }

    static get imagePrefix(): string {
        return this.serviceUrl + this.service.getSegment(LocalServiceEndpoint.Image) + '/';
    }

    static get retweetPrefix(): string {
        return this.serviceUrl + this.service.getSegment(LocalServiceEndpoint.Retweet) + '/';
    }

    static get replyPrefix(): string {
        return this.serviceUrl + this.service.getSegment(LocalServiceEndpoint.Reply) + '/';
    }

    static likePrefix(liked: boolean): string {
        return this.serviceUrl + (liked ? this.service.getSegment(LocalServiceEndpoint.Unlike) + '/' : this.service.getSegment(LocalServiceEndpoint.Like) + '/');
    }
    
    static followPrefix(followed: boolean): string {
        return this.serviceUrl + (followed? this.service.getSegment(LocalServiceEndpoint.Unfollow) + '/' : this.service.getSegment(LocalServiceEndpoint.Follow) + '/');
    }

    static reloadLink(getNew: boolean): string {
        return this.serviceUrl + this.service.getSegment(LocalServiceEndpoint.Refresh) + '/' + (getNew ? 'true' : 'false') + '/';
    }

    static get cssLink(): string {
        return this.serviceUrl + this.service.getSegment(LocalServiceEndpoint.Css) + '/';
    }

    static tweetLink(tweet: Tweet): string {
        return 'https://twitter.com/' + tweet.user.screenName + '/status/' + tweet.id;
    }
    
    static userDetailLink(screenName: string): string {
        return 'https://twitter.com/' + screenName;
    }

    static userLink(screenName: string): string {
        return this.userLinkPrefix + screenName;
    }

    static likeLink(tweet: Tweet): string {
        return this.likePrefix(tweet.liked) + tweet.id;
    }

    static retweetLink(tweet: Tweet): string {
        return (tweet.retweeted ? '' : this.retweetPrefix + tweet.id + '/' + querystring.escape(this.tweetLink(tweet)) + '/' + querystring.escape('@' + tweet.user.screenName + ': ' + stringz.limit(tweet.text, 10)));
    }

    static replyLink(tweet: Tweet): string {
        return this.replyPrefix + tweet.id + '/' + tweet.user.screenName;
    }
    
    static followLink(followed: boolean, screenName: string): string {
        return this.followPrefix(followed) + screenName;
    }

    private static createLink(text: string, url: string): string {
        return '<a target="_blank" href="' + url + '">' + text + '</a>';
    }

    private static createRefreshLink(type: TimelineType, query: string): string {
        return this.createUpdatableLink(this.refreshSymbol, this.reloadLink(true) + type + (query == null ? '' : '/' + querystring.escape(query)));
    }

    private static createLoadOlderLink(type: TimelineType, query: string): string {
        return this.createUpdatableLink('Load more tweets...', this.reloadLink(false) + type + (query == null ? '' : '/' + querystring.escape(query)));
    }

    private static createUpdatableLink(text: string, url: string, update: boolean = false): string {
        const replaceCallback = 'var self=this;xhttp.onreadystatechange=function(){if(xhttp.readyState==4){console.log(\'done\');if(xhttp.responseText!=\'\'){self.outerHTML=xhttp.responseText;}}};';
        return '<a onclick="console.log(\'clicked\');xhttp=new XMLHttpRequest();xhttp.open(\'GET\', \'' + url + '\', true);' + (update ? replaceCallback : '') + 'xhttp.send();" >' + text + '</a>';
    }

    private static bold(text: string): string {
        return '<strong>' + text + '</strong>';
    }

    private static head1(text: string): string {
        return '<h1>' + text + '</h1>';
    }

    static formatTimeline(title: string, type: TimelineType, query: string, description: string, tweets: string): string {
        var result = '<head><link rel="stylesheet" href="' + this.cssLink + '" type="text/css" media="screen">';
        result += '<style>*{font-size: inherit;} h1{font-size: 2em;} span.liked{color: red;} span.retweeted{color: green;} span.unfollow{color: red;}</style></head>';
    
        result += '<body><div style="padding-right:16px;"><h1>' + title + '&nbsp;' + this.createRefreshLink(type, query) + '&nbsp;&nbsp;' + 
        '<span style="font-size:0.5em;">Last updated at ' + moment().format('h:mm A, MMM D, YYYY') + '</span></h1>' + 
        '<p>' + description + '</p><div id="tweets">' + tweets + '</div><center><h1>' + this.createLoadOlderLink(type, query) + '</h1></center></div></body>';
        
        const videos = result.match(/<\/video>/gi);
        var videoCount = 0;
        if (videos) {
            videoCount = videos.length;
        }
        if (videoCount > 10) {
            console.log('Too many videos (' + videoCount + '), disabling auto play');
            result = result.replace(new RegExp(this.autoplayControl + '>', 'g'), this.videoControl + ' loop >');
        }
        return result;
    }

    static formatTweets(tweets: Tweet[]): string {
        return tweets.map<string>((t) => { return this.formatTweet(t, false); }).join('');
    }

    private static formatTweet(tweet: Tweet, quoted: boolean): string {

        var autoplayControl = this.autoPlay ? this.autoplayControl : ' ';
        var quoteBegin = '<blockquote>'.repeat(quoted ? 1 : 0);
        var quoteEnd = '</blockquote>'.repeat(quoted ? 1 : 0);
        if (tweet.retweetedStatus) {
            return '<p>' + this.formatUser(tweet.user, UserFormatPosition.Retweet) + ' ' + 'Retweeted' + '</p><p>' + this.formatTweet(tweet.retweetedStatus, quoted) + '</p>';
        }

        var result = quoteBegin + '<p>' + this.formatUser(tweet.user, quoted ? UserFormatPosition.Quoted : UserFormatPosition.Tweet);
        if (!quoted) {
            result += this.dotSeparator + moment(tweet.created.replace(/( +)/, ' UTC$1')).fromNow();
        }
        
        result += '&nbsp;(' + this.createLink('Detail', this.tweetLink(tweet)) + ')';
        result += '</p><p>' + this.processText(tweet.entity, tweet.text) + '</p>';

        if (tweet.quoted) {
            result += this.formatTweet(tweet.quoted, true);
        }

        if (tweet.entity.media && !this.noMedia) {
            result += this.formatMedia(tweet.entity.media, quoted);
        }
        if (!quoted) result += this.formatStatusLine(tweet) + this.endLine;
        result += quoteEnd;
        return result;
    }
    
    private static processText(entity: Entity, text: string, handleTrailingUrl = true) {
        var trailingUrlBehavior = handleTrailingUrl ? (this.noMedia ? TrailingUrlBehavior.Urlify : TrailingUrlBehavior.Remove) : TrailingUrlBehavior.NoChange;
        return entity.processText(text, trailingUrlBehavior, 
            (name, screenName) => { return this.createUpdatableLink(name, this.userLink(screenName)); },
            (token, text) => { return this.createUpdatableLink(token, this.hashTagLinkPrefix + text); },
            (token, text) => { return this.createUpdatableLink(token, this.searchPrefix + text); },
            (text, url) => { return this.createLink(text, url); });
    }

    private static formatMedia(media: any[], quoted: boolean): string {
        var result = '';
        const size = quoted ? ':thumb' : ':small';
        var mediaStr = media.map<string>((value, index, array): string => {
            var mediaStr = '';
            if (value.type == 'video' || value.type == 'animated_gif') {
                const control = ((value.type == 'animated_gif') ? this.autoplayControl : this.videoControl);
                const variants: any[] = value.video_info.variants;
                if (variants.length != 0) {
                    mediaStr += '<details><summary>[video]</summary><video width="340" poster="' + value.media_url_https + '" ' + control + '>';
                    variants.filter((video, index, array) => { 
                        return (video.content_type as string).startsWith("video"); 
                    }).forEach((video, index, array) => {
                        mediaStr += '<source src="' + video.url + '" type="' + video.content_type + '"/>';
                    });
                    mediaStr += '</video></details>';
                    return mediaStr;
                }
            }
            // not video, use image
            var linkImage = this.createUpdatableLink('<img src="' + value.media_url_https + size + '"/>', this.imagePrefix + encodeURIComponent(value.media_url_https + ':large'));
            var imgUrl = '<details><summary>[image]</summary>' + linkImage + '</details>';
            return imgUrl;
        }).join(' ');
        if (mediaStr != '') {
            result += '<p>' + mediaStr + '</p>';
        }
        return result;
    }

    static formatUser(user: User, position: UserFormatPosition): string {
        var result = ''
        
        if (position == UserFormatPosition.Tweet) {
            if (!this.noMedia) {
                result += '<img src="' + user.image + '"/>&nbsp;';
            }
            result += this.createUpdatableLink(user.name, this.userLink(user.screenName));
        } else if (position == UserFormatPosition.Retweet) {
            result += this.retweetSymbol + ' ' + this.createUpdatableLink(user.name, this.userLink(user.screenName));
        } else if (position == UserFormatPosition.Quoted) {
            result += this.bold(user.name) + ' ' + this.createUpdatableLink('@' + user.screenName, this.userLink(user.screenName));
        } else if (position == UserFormatPosition.Profile) {
            if (!this.noMedia) {
                result += '<div style="float: left; margin-right: 1em;"><img style="width: 200; height: 200;" src="' + user.image.replace('_normal', '_400x400') + '"/></div>';
            }
            result += '<p><span style="font-size: 1.5em;"><strong>' + this.createLink(user.name, this.userDetailLink(user.screenName)) + '</strong></span>&nbsp;&nbsp;' + 
            this.createLink('@' + user.screenName, this.userDetailLink(user.screenName)) + 
            this.barSeparator + this.formatFollow(user.following, user.screenName) + '</p>' +
            (user.url != null ? '<p>' + this.createLink(this.getExpandedUrl(user), user.url) + '</p>' : '') + 
            '<p>' + this.processText(user.descriptionEntity, user.description, false) + '</p>' + 
            '<p><strong>Location: </strong>&nbsp;' + user.location + '</p>' +
            '<p><strong>Joined: </strong>&nbsp;' + moment(user.createdAt.replace(/( +)/, ' UTC$1')).format('MMM-DD-YYYY') + '</p>' +  
            '<p><strong>Tweets: </strong>&nbsp;' + user.statusesCount + this.barSeparator +
            '<strong>Following: </strong>&nbsp;' + user.friendsCount + this.barSeparator +
            '<strong>Followers: </strong>&nbsp;' + user.followersCount + this.barSeparator +
            '<strong>Likes: </strong>&nbsp;' + user.favouritesCount +'</p>' +             
            '<div style="clear: both;">&nbsp;</div><hr/>';
        }
        return result;
    }
    
    private static getExpandedUrl(user: User): string {
        if (user.urlEntity != null && user.urlEntity.urls.length > 0) {
            return user.urlEntity.urls[0].expanded_url;
        } else {
            return user.url;
        }
    }

    private static formatStatusLine(tweet: Tweet): string {
        var result = this.createUpdatableLink(this.replySymbol, this.replyLink(tweet));
        result += this.spaceSeparator + this.formatRetweet(tweet);
        result += this.spaceSeparator + this.formatLike(tweet);
        return result;
    }

    static formatRetweet(tweet: Tweet): string {
        var text = this.retweetSymbol + (tweet.retweetCount == 0 ? '' : ' ' + tweet.retweetCount + ' ');
        if (tweet.retweeted) {
            text = '<span class="retweeted">' + text + '</span>';
        }
        return (tweet.retweeted ? text : this.createUpdatableLink(text, this.retweetLink(tweet), true));
    }

    static formatLike(tweet: Tweet): string {
        var text = this.heartSymbol + (tweet.likeCount == 0 ? '' : ' ' + tweet.likeCount + ' ');
        if (tweet.liked) {
            text = '<span class="liked">' + text + '</span>';
        }
        return this.createUpdatableLink(text, this.likeLink(tweet), true);
    }
    
    static formatFollow(followed: boolean, screenName: string): string {
        var text = followed ? 'Following' : '<span class="unfollow">Not Following</span>';
        return this.createUpdatableLink(text, this.followLink(followed, screenName), true);
    }
}
