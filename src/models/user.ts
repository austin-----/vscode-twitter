import Entity from './entity';

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
    entity: Entity;
    
    constructor(id: string, name: string, screenName: string, image: string, description: string, url: string, statusesCount: number, verified: boolean, following: boolean, location: string, followersCount: number, friendsCount: number, createdAt: string) {
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
    }
    
    static fromJson(userJson:any): User {
        var user = new User(userJson.id_str, userJson.name, userJson.screen_name, userJson.profile_image_url_https, userJson.description, userJson.url, userJson.statuses_count, userJson.verified, userJson.following, userJson.location, userJson.followers_count, userJson.friends_count, userJson.created_at);
        user.entity = Entity.fromJson(userJson.entities.description, null);
        return user;
    }
}