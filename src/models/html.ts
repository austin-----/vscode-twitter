import Tweet from './tweet';
import {TimelineType} from './timeline';

var moment = require('moment');

export default class HTMLFormatter {
    static formatTimeline(title: string, type: TimelineType, query: string, tweets: string): string {
        var result = '<head><link rel="stylesheet" href="https://raw.githubusercontent.com/Microsoft/vscode/0.10.8/src/vs/languages/markdown/common/markdown.css" type="text/css" media="screen">';
        result += '<link rel="stylesheet" href="https://raw.githubusercontent.com/Microsoft/vscode/0.10.8/src/vs/languages/markdown/common/tokens.css" type="text/css" media="screen">';
        result += '<style>*{font-size: inherit;} h1{font-size: 2em;} span.liked{color: red;} span.retweeted{color: green;}</style></head>';
        result += '<body><h1>' + title + '&nbsp;' + this.createRefreshLink(type, query) + '</h1>' + '<div id="tweets">' + tweets + '</div></body>';
        const videos = result.match(/<\/video>/gi);
        var videoCount = 0;
        if (videos) {
            videoCount = videos.length;
        }
        if (videoCount > 10) {
            console.log('Too many videos (' + videoCount + '), disabling auto play');
            result = result.replace(new RegExp(Tweet.autoplayControl + '>', 'g'), Tweet.videoControl + ' loop >');
        }
        return result;
    }
    
    static formatTweets(tweets: Tweet[]): string {
        return tweets.map<string>((t) => { return this.formatTweet(t); }).join('');
    }
    
    private static formatTweet(tweet: Tweet, level: number = 0): string {
	    var quoteBegin = '<blockquote>'.repeat(level);
        var quoteEnd = '</blockquote>'.repeat(level); 
        if (tweet.retweeted_status) {
            return '<p>' + this.formatUser(tweet, -1) + ' ' + 'Retweeted' + '</p><p>' + this.formatTweet(tweet.retweeted_status, level) + '</p>';
        }

        var result = quoteBegin + '<p>' + this.formatUser(tweet, level) + '</p><p>' +
            tweet.normalizeText(this.createUpdatableLink, this.createLink) + '</p>';

        if (tweet.quoted) {
            result += this.formatTweet(tweet.quoted, level + 1);
        }

        if (tweet.media) {
            const size = (level == 0) ? ':small' : ':thumb';
            var mediaStr = tweet.media.map<string>((value, index, array): string => {
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
                return this.createUpdatableLink('<img src="' + value.media_url_https + size + '"/>', Tweet.imagePrefix + encodeURIComponent(value.media_url_https + ':large'));
            }).join(' ');
            if (mediaStr != '') {
                result += '<p>' + mediaStr + '</p>';
            }
        }
        if (level == 0) result += this.formatStatusLine(tweet) + Tweet.endLine;
        result += quoteEnd;
        return result;
    }
    
    private static createLink(text: string, url: string): string {
        return '<a target="_blank" href="' + url + '">' + text + '</a>';
    }
    
    private static createRefreshLink(type: TimelineType, query: string): string {
        return this.createUpdatableLink(Tweet.refreshSymbol, Tweet.reloadLink() + type + (query == null ? '/null' : '/' + query));
    }
    
    private static createUpdatableLink(text: string, url: string, update: boolean = false): string {
        const replaceCallback = 'var self=this;xhttp.onreadystatechange=function(){if(xhttp.readyState==4){console.log(\'done\');if(xhttp.responseText!=\'\'){self.outerHTML=xhttp.responseText;}}};';
        return '<a onclick="console.log(\'clicked\');xhttp=new XMLHttpRequest();xhttp.open(\'GET\', \'' + url + '\', true);' + (update ? replaceCallback : '') + 'xhttp.send();" >' + text + '</a>';
    }
    
    private static formatUser(tweet: Tweet, level: number): string {
        var result = ''
        if (level == 0) {
            result += '<img src="' + tweet.userImage + '"/>&nbsp;';
        }
        if (level == -1) {
            result += Tweet.retweetSymbol + ' ' + this.createUpdatableLink(tweet.userName, tweet.userLink());
        } else {
            result += Tweet.bold(tweet.userName) + ' ' + this.createUpdatableLink(Tweet.normalizeUnderscore('@' + tweet.userScreenName), tweet.userLink());
        }

        if (level == 0) {
            result += Tweet.dotSeparator + moment(tweet.created.replace(/( +)/, ' UTC$1')).fromNow();
        }
        if (level != -1) {
            result += '&nbsp;(' + this.createLink('Detail', tweet.tweetLink()) + ')';
        }
        return result;
    }
    
    private static formatStatusLine(tweet: Tweet): string {
        var result = this.createUpdatableLink(Tweet.replySymbol, tweet.replyLink());
        result += Tweet.spaceSeparator + this.formatRetweet(tweet);
        result += Tweet.spaceSeparator + this.formatLike(tweet);
        return result;
    }
    
    static formatRetweet(tweet: Tweet): string {
        var text = Tweet.retweetSymbol + (tweet.retweetCount == 0 ? '' : ' ' + tweet.retweetCount + ' ');
        if (tweet.retweeted) {
            text = '<span class="retweeted">' + text + '</span>';
        }
        return (tweet.retweeted ? text : this.createUpdatableLink(text, tweet.retweetLink(), true));
    }

    static formatLike(tweet: Tweet): string {
        var text = Tweet.heartSymbol + (tweet.likeCount == 0 ? '' : ' ' + tweet.likeCount + ' ');
        if (tweet.liked) {
            text = '<span class="liked">' + text + '</span>';
        }
        return this.createUpdatableLink(text, tweet.likeLink(), true);
    }
}