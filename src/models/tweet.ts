import User from './user';
import {TrailingUrlBehavior, EntityType, Entity} from './entity';

export default class Tweet {
    id: string;
    text: string;
    created: string;
    quoted: Tweet;
    entity: Entity;
    retweetedStatus: Tweet;
    retweetCount: number;
    retweeted: boolean;
    likeCount: number;
    liked: boolean;
    replyTo: string;
    user: User;
    parsedText: [EntityType, any][];
    displayTextRange: [number, number];

    constructor(id: string, created: string, text: string, user:User, retweetCount: number, retweeted: boolean, likeCount: number, liked: boolean, displayTextRange: [number, number]) {
        this.id = id;
        this.created = created;
        this.text = text;
        this.user = user;
        this.retweetCount = retweetCount;
        this.retweeted = retweeted;
        this.likeCount = likeCount;
        this.liked = liked;
        this.displayTextRange = displayTextRange;
    }

    static fromJson(tweetJson: any): Tweet {
        var user = User.fromJson(tweetJson.user);
        
        var tweet = new Tweet(tweetJson.id_str, tweetJson.created_at, tweetJson.full_text, user, tweetJson.retweet_count, tweetJson.retweeted, tweetJson.favorite_count, tweetJson.favorited, tweetJson.display_text_range);

        if (tweetJson.in_reply_to_screen_name) {
            tweet.replyTo = tweetJson.in_reply_to_screen_name;
        }

        if (tweetJson.quoted_status) {
            tweet.quoted = Tweet.fromJson(tweetJson.quoted_status);
        }

        if (tweetJson.retweeted_status) {
            tweet.retweetedStatus = Tweet.fromJson(tweetJson.retweeted_status);
        }
	    
        tweet.entity = Entity.fromJson(tweetJson.entities, tweetJson.extended_entities);
        
        tweet.parsedText = tweet.entity.processText(tweet.text, tweet.displayTextRange); //no media: urlify

        return tweet;
    }
}