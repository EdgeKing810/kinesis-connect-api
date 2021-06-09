import { MongoClient, config } from '../deps.ts';

const client = new MongoClient();
client.connectWithUri(config().URI);
//await client.connect(config().URI);

const db = client.database(config().DB_NAME);

// KINESIS CONNECT

interface UserSchema {
  _id: { $oid: string };
  uid: string;
  active: string;
  token: string;
  name: string;
  username: string;
  email: string;
  password: string;
  roomID: string;
}

interface ProfileSchema {
  uid: string;
  bio: string;
  profile_pic: string;
  followers: UIDSchema[];
  following: UIDSchema[];
  blocked: UIDSchema[];
  chats: RoomSchema[];
}

interface PostSchema {
  uid: string;
  postID: string;
  content: string;
  timestamp: Date;
  reacts: UIDSchema[];
  comments: CommentSchema[];
}

interface ChatSchema {
  room: string;
  members: UIDSchema[];
  messages: MessageSchema[];
}

interface NotificationSchema {
  uid: string;
  notifications: NotifSchema[];
}

interface LinkSchema {
  uid: string;
  links: lSchema[];
}

interface UIDSchema {
  uid: string;
}

interface RoomSchema {
  uid: string;
  name: string;
}

interface CommentSchema {
  uid: string;
  commentID: string;
  comment: string;
  timestamp: Date;
  reacts: UIDSchema[];
}

interface MessageSchema {
  messageID: string;
  senderID: string;
  message: string;
  timestamp: Date;
}

interface NotifSchema {
  notificationID: string;
  profileID: string;
  type: string;
  timestamp: Date;
  seen: boolean;
}

interface lSchema {
  linkID: string;
  link: string;
}

const users = db.collection<UserSchema>('users');
const profiles = db.collection<ProfileSchema>('profiles');
const posts = db.collection<PostSchema>('posts');
const chats = db.collection<ChatSchema>('chats');
const notifications = db.collection<NotificationSchema>('notifications');
const links = db.collection<LinkSchema>('links');

// KINESIS BLOG

interface BlogSchema {
  blogID: string;
  authorID: string;
  title: string;
  slug: string;
  subtitle: string;
  preview_img: string;
  status: string;
  tags: string;
  created_on: Date;
  updated_on: Date;
  content: string;
  views: UIDSchema[];
  likes: UIDSchema[];
  carousel: string[];
  comments: CommentSchema[];
}

interface BlogProfileSchema {
  uid: string;
  blog_description: string;
  blog_posts: UIDSchema[];
  blog_followers: UIDSchema[];
  blog_following: UIDSchema[];
  banner_img: string;
  favorites: UIDSchema[];
  notifications: BlogNotificationSchema[];
}

interface BlogNotificationSchema {
  notificationID: string;
  uid: string;
  type: string;
  linkTo: string;
  timestamp: Date;
  seen: boolean;
}

const blog_posts = db.collection<BlogSchema>('blog_posts');
const blog_profiles = db.collection<BlogProfileSchema>('blog_profiles');

// KINESIS SHOP

interface ShopUserSchema {
  uid: string;
  address: ShopUserAddressSchema;
  preferred_payment: string;
  is_admin: boolean;
}

interface ShopUserAddressSchema {
  country: string;
  state: string;
  city: string;
  address: string;
  postal_code: string;
  number: string;
}

interface ShopProductSchema {
  uid: string;
  productID: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  images: string[];
  reviews: ShopProductReviewSchema[];
  amount: number;
  price: number;
  shipping_cost: number;
}

interface ShopProductReviewSchema {
  uid: string;
  reviewID: string;
  review: string;
  rating: string;
  date: Date;
}

interface ShopOrderSchema {
  uid: string;
  orderID: string;
  date: Date;
  is_paid: ShopOrderStatusSchema;
  is_delivered: ShopOrderStatusSchema;
  tax_percentage: number;
  products: ShopOrderProductSchema[];
}

interface ShopOrderStatusSchema {
  status: boolean;
  date: Date;
}

interface ShopOrderProductSchema {
  uid: string;
  productID: string;
  amount: number;
}

const shop_users = db.collection<ShopUserSchema>('shop_users');
const shop_products = db.collection<ShopProductSchema>('shop_products');
const shop_orders = db.collection<ShopOrderSchema>('shop_orders');

// Kinesis Chat
interface ChatProfileSchema {
  uid: string;
  name: string;
  username: string;
  password: string;
  bio: string;
  created_on: Date;
  profile_pic: string;
  contacts: ChatContactSchema[];
  received_requests: UIDSchema[];
  sent_requests: UIDSchema[];
  blocked: UIDSchema[];
  has_been_blocked: UIDSchema[];
}

interface ChatContactSchema {
  uid: string;
  nickname: string;
}

interface ChatRoomSchema {
  uid: string;
  roomID: string;
  description: string;
  created_on: Date;
  modified_on: Date;
  preview_img: string;
  admins: UIDSchema[];
  members: UIDSchema[];
  messages: ChatMessageSchema[];
}

interface ChatMessageSchema {
  uid: string;
  messageID: string;
  created_on: Date;
  modified_on: Date;
  content: string;
  is_deleted: boolean;
  threads: ChatThreadSchema[];
  reacts: ChatReactSchema[];
  reply_to: string;
}

interface ChatThreadSchema {
  uid: string;
  threadID: string;
  created_on: Date;
  modified_on: Date;
  content: string;
  is_deleted: boolean;
  reacts: ChatReactSchema[];
  reply_to: string;
}

interface ChatReactSchema {
  uid: string;
  reactID: string;
  react: string;
}

interface ChatStatusSchema {
  uid: string;
  statusID: string;
  posted_on: string;
  content_source: string;
  caption: string;
  is_deleted: boolean;
}

const chat_profiles = db.collection<ChatProfileSchema>('chat_profiles');
const chat_rooms = db.collection<ChatRoomSchema>('chat_rooms');
const chat_statuses = db.collection<ChatStatusSchema>('chat_statuses');

interface ContactSchema {
  uid: string;
  name: string;
  email: string;
  message: string;
  timestamp: Date;
}

const contact_messages = db.collection<ContactSchema>('contact_messages');

export {
  db,
  users,
  profiles,
  posts,
  chats,
  notifications,
  links,
  blog_posts,
  blog_profiles,
  shop_users,
  shop_products,
  shop_orders,
  chat_profiles,
  chat_rooms,
  chat_statuses,
  contact_messages,
};
