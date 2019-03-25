import {EntityType, Entity, TrailingUrlBehavior} from './entity';

export default class User {
    id: string;
    name: string;
    screenName: string;
    image: string;
    description: string;
    url: string;
    statusesCount: number;
    verified: boolean;
    following: boolean;
    location: string;
    followersCount: number;
    friendsCount: number;
    createdAt: string;
    favouritesCount: number;
    descriptionEntity: Entity;
    urlEntity: Entity;
    parsedDescription: [EntityType, any][];
    
    constructor(id: string, name: string, screenName: string, image: string, description: string, url: string, statusesCount: number, verified: boolean, following: boolean, location: string, followersCount: number, friendsCount: number, createdAt: string, favoritesCount: number) {
        this.id = id;
        this.name = name;
        this.screenName = screenName;
        this.image = image;
        this.description = description;
        this.url = url;
        this.statusesCount = statusesCount;
        this.verified = verified;
        this.following = following;
        this.location = location;
        this.followersCount = followersCount;
        this.friendsCount = friendsCount;
        this.createdAt = createdAt;
        this.favouritesCount = favoritesCount;
    }
    
    static fromJson(userJson:any): User {
        var user = new User(userJson.id_str, userJson.name, userJson.screen_name, userJson.profile_image_url_https, userJson.description, userJson.url, userJson.statuses_count, userJson.verified, userJson.following, userJson.location, userJson.followers_count, userJson.friends_count, userJson.created_at, userJson.favourites_count);
        user.descriptionEntity = Entity.fromJson(userJson.entities.description, null);
        user.parsedDescription = user.descriptionEntity.processText(user.description);
        user.urlEntity = Entity.fromJson(userJson.entities.url, null);
        return user;
    }
}