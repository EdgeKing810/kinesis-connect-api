import { Router, upload } from '../deps.ts';

import authController from '../controllers/AuthController.ts';
import profileController from '../controllers/ProfileController.ts';
import postController from '../controllers/PostController.ts';
import messageController from '../controllers/MessageController.ts';
import feedController from '../controllers/FeedController.ts';
import notificationController from '../controllers/NotificationController.ts';
import linkController from '../controllers/LinkController.ts';
import blogController from '../controllers/BlogController.ts';
import blogProfileController from '../controllers/BlogProfileController.ts';
import shopUserController from '../controllers/ShopUserController.ts';
import shopProductController from '../controllers/ShopProductController.ts';
import shopOrderController from '../controllers/ShopOrderController.ts';
import chatProfileController from '../controllers/ChatProfileController.ts';
import chatRoomController from '../controllers/ChatRoomController.ts';

import authMiddleware from '../middlewares/authMiddleware.ts';
import chatMiddleware from '../middlewares/chatMiddleware.ts';

const router = new Router();

router
  .get('/', (ctx: any) => {
    ctx.response.body = "Welcome to Kinesis Connect's API!";
  })

  // Auth
  .post('/api/user/login', authController.login)
  .post('/api/user/register', authController.register)
  .post('/api/user/update', authController.update)
  .post('/api/user/delete', authController.delete)
  .get('/api/user/activate/:username/:token', authController.activate)

  // Testing Middleware
  .post('/api/middleware', authMiddleware, (ctx: any) => {
    ctx.response.body = "Kinesis Connect's Middleware works!";
  })

  // Profile
  .post('/api/profiles/fetch', authMiddleware, profileController.fetchAll)
  .post('/api/profile/fetch', authMiddleware, profileController.fetch)
  .post('/api/profile/update', authMiddleware, profileController.update)
  .post('/api/profile/pic', authMiddleware, profileController.updateProfilePic)
  .post('/api/profile/follow', authMiddleware, profileController.follow)
  .post('/api/profile/block', authMiddleware, profileController.block)

  // Post
  .post('/api/posts/get', authMiddleware, postController.fetch)
  .post('/api/post/create', authMiddleware, postController.create)
  .post('/api/post/update', authMiddleware, postController.update)
  // .post('/api/post/delete', authMiddleware, postController.delete)

  // Room
  .post('/api/room/join', authMiddleware, messageController.join)
  .post('/api/room/leave', authMiddleware, messageController.leave)

  // Message
  .post('/api/messages/get', authMiddleware, messageController.fetch)
  .post('/api/message/send', authMiddleware, messageController.create)
  .post('/api/message/edit', authMiddleware, messageController.update)
  .post('/api/message/delete', authMiddleware, messageController.delete)

  // Feed
  .post('/api/feed/fetch', authMiddleware, feedController.fetch)
  .post('/api/post/react', authMiddleware, feedController.react)
  .post('/api/post/comment/add', authMiddleware, feedController.addComment)
  .post('/api/post/comment/edit', authMiddleware, feedController.editComment)
  .post('/api/post/comment/react', authMiddleware, feedController.reactComment)
  .post(
    '/api/post/comment/delete',
    authMiddleware,
    feedController.deleteComment
  )

  .post(
    '/api/notifications/fetch',
    authMiddleware,
    notificationController.fetch
  )
  .post(
    '/api/notifications/create',
    authMiddleware,
    notificationController.create
  )

  .post('/api/links/fetch', authMiddleware, linkController.fetch)
  .post('/api/links/create', authMiddleware, linkController.create)

  // Blog
  .post('/api/blog/posts/fetch', blogController.fetchAll)

  .post('/api/blog/post/create', authMiddleware, blogController.create)
  .post('/api/blog/post/edit', authMiddleware, blogController.update)
  .post('/api/blog/post/delete', authMiddleware, blogController.delete)

  .post('/api/blog/post/view', authMiddleware, blogController.view)
  .post('/api/blog/post/like', authMiddleware, blogController.like)
  .post('/api/blog/post/favorite', authMiddleware, blogController.favorite)

  .post('/api/blog/users/fetch', blogProfileController.fetchAll)
  .post(
    '/api/blog/user/update',
    authMiddleware,
    blogProfileController.updateDesc
  )
  .post('/api/blog/user/follow', authMiddleware, blogProfileController.follow)

  .post('/api/blog/post/comment/add', authMiddleware, blogController.addComment)
  .post(
    '/api/blog/post/comment/edit',
    authMiddleware,
    blogController.editComment
  )
  .post(
    '/api/blog/post/comment/delete',
    authMiddleware,
    blogController.deleteComment
  )
  .post(
    '/api/blog/post/comment/like',
    authMiddleware,
    blogController.likeComment
  )

  .post(
    '/api/blog/user/posts/fetch',
    authMiddleware,
    blogController.fetchCurrent
  )

  .post(
    '/api/blog/user/notification/create',
    authMiddleware,
    blogProfileController.createNotification
  )

  .post(
    '/api/blog/user/notification/read',
    authMiddleware,
    blogProfileController.readNotification
  )

  .post(
    '/api/blog/user/notification/delete',
    authMiddleware,
    blogProfileController.deleteNotification
  )

  // Shop
  .post('/api/shop/users', shopUserController.fetchAll)
  .post('/api/shop/user/admin', authMiddleware, shopUserController.convertAdmin)
  .post('/api/shop/user/update', authMiddleware, shopUserController.updateInfo)

  .post('/api/shop/products', shopProductController.fetchAll)
  .post(
    '/api/shop/product/create',
    authMiddleware,
    shopProductController.create
  )
  .post('/api/shop/product/edit', authMiddleware, shopProductController.edit)
  .post(
    '/api/shop/product/review/create',
    authMiddleware,
    shopProductController.createReview
  )
  .post(
    '/api/shop/product/review/edit',
    authMiddleware,
    shopProductController.editReview
  )

  .post('/api/shop/orders', authMiddleware, shopOrderController.fetch)
  .post('/api/shop/order/create', authMiddleware, shopOrderController.create)
  .post('/api/shop/order/update', authMiddleware, shopOrderController.update)

  .post(
    '/api/chat/users/fetch',
    chatMiddleware,
    chatProfileController.fetchUsers
  )
  .post('/api/chat/user/register', chatProfileController.register)
  .post('/api/chat/user/login', chatProfileController.login)
  .post('/api/chat/user/update', chatMiddleware, chatProfileController.update)
  .post(
    '/api/chat/user/request/send',
    chatMiddleware,
    chatProfileController.sendRequest
  )
  .post(
    '/api/chat/user/request/accept',
    chatMiddleware,
    chatProfileController.acceptRequest
  )
  .post(
    '/api/chat/user/disconnect',
    chatMiddleware,
    chatProfileController.removeContact
  )
  .post(
    '/api/chat/user/block',
    chatMiddleware,
    chatProfileController.blockContact
  )
  .post(
    '/api/chat/user/nickname',
    chatMiddleware,
    chatProfileController.updateContact
  )

  .post('/api/chat/rooms/fetch', chatMiddleware, chatRoomController.fetchRooms)
  .post('/api/chat/room/create', chatMiddleware, chatRoomController.createRoom)
  .post('/api/chat/room/update', chatMiddleware, chatRoomController.updateRoom)
  .post(
    '/api/chat/room/member/add',
    chatMiddleware,
    chatRoomController.addRoomMember
  )
  .post(
    '/api/chat/room/member/remove',
    chatMiddleware,
    chatRoomController.removeRoomMember
  )

  // Misc / Utility
  .post(
    '/api/user/upload',
    upload('uploads', {
      extensions: ['png', 'svg', 'jpg', 'jpeg', 'gif', 'bmp'],
      maxSizeBytes: 10485760,
      maxFileSizeBytes: 10485760,
    }),
    profileController.upload
  );

export default router;
