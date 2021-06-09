import { posts } from '../components/mongo.ts';

class PostController {
  async fetch(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid } = await value;

    if (!uid) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Find all posts the user posted
    const userPosts: any = await posts.find({ uid: uid });

    // Check and respond with an error if no posts
    if (userPosts.length === 0) {
      // ctx.response.status = 404;
      ctx.response.body = { message: 'No posts found for user.', error: 404 };
      return;
    }

    ctx.response.body = { posts: userPosts, error: 0 };
  }

  async create(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, postID, content, timestamp } = await value;

    if (!uid || !postID || !content || !timestamp) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Ensure no post with supplied postID exists
    const existing = await posts.findOne({ postID: postID });

    if (existing) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: 'Supplied Post ID already corresponds to an existing post.',
        error: 403,
      };
      return;
    }

    // Create an object based on the characteristics of the new post
    const newPost = {
      uid: uid,
      postID: postID,
      content: content,
      timestamp: timestamp,
      reacts: [],
      comments: [],
    };

    // Save the new post in the db
    await posts.insertOne(newPost);

    ctx.response.body = { message: 'Post added successfully!', error: 0 };
  }

  async update(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, postID, content, timestamp } = await value;

    if (!uid || !postID || !content || !timestamp) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Find the post being referenced
    const post = await posts.findOne({ postID: postID });

    // Check if post exists
    if (!post) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: "Post being referenced doesn't exist.",
        error: 404,
      };
      return;
    }

    // Check if owner of post
    if (post.uid !== uid) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: 'Not owner of post.',
        error: 403,
      };
      return;
    }

    // Prepare the updated post object
    const updatedPost = {
      uid: post.uid,
      postID: post.postID,
      content: content,
      timestamp: timestamp,
      reacts: post.reacts,
      comments: post.comments,
    };

    // Save the updated post
    await posts.updateOne({ postID: postID }, { $set: updatedPost });

    ctx.response.body = { message: 'Post updated successfully!', error: 0 };
  }

  async delete(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, postID } = await value;

    if (!uid || !postID) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Find the post being referenced
    const post = await posts.findOne({ postID: postID });

    // Check if post exists
    if (!post) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: "Post being referenced doesn't exist.",
        error: 404,
      };
      return;
    }

    // Check if owner of post
    if (post.uid !== uid) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: 'Not owner of post.',
        error: 403,
      };
      return;
    }

    // Delete the post being referenced
    await posts.deleteOne({ postID: postID });

    ctx.response.body = { message: 'Post deleted successfully!', error: 0 };
  }
}

const postController = new PostController();
export default postController;
