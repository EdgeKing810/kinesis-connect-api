import { profiles, posts } from '../components/mongo.ts';

class FeedController {
  async fetch(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid } = await value;

    if (!uid) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Find UID of users current user follows
    const profile = await profiles.findOne({ uid: uid });
    let following = profile!.following.map((p: any) => p.uid);
    const blocked = profile!.blocked.map((p: any) => p.uid);

    const allProfiles: any = await profiles.find();

    // Find all posts
    const userPosts: any = await posts.find({ uid: { $ne: uid } });
    let followerPosts: any = userPosts.filter((post: any) =>
      following.includes(post.uid)
    );

    // Check and respond with an error if no posts
    if (followerPosts.length === 0) {
      // ctx.response.status = 404;
      ctx.response.body = { message: 'No posts found.', error: 404 };
      return;
    }

    // Remove comments of users who are blocked / blocked current user
    let filteredPosts: any = [];

    followerPosts.forEach(async (post: any) => {
      let comments: any = [];

      post.comments.forEach((comm: any) => {
        const cProfile = allProfiles.find((c: any) => c.uid === comm.uid);
        const cBlocked = cProfile!.blocked.map((p: any) => p.uid);

        if (!blocked.includes(comm.uid) && !cBlocked.includes(uid)) {
          comments.push({ ...comm });
        }
      });

      filteredPosts.push({
        uid: post.uid,
        postID: post.postID,
        content: post.content,
        timestamp: post.timestamp,
        reacts: post.reacts,
        comments: comments,
      });
    });

    ctx.response.body = { posts: filteredPosts, error: 0 };
  }

  async react(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, profileID, postID, like } = await value;

    if (!uid || !profileID || !postID || !like) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Find list of users blocked
    const currentProfile = await profiles.findOne({ uid: uid });
    const profile = await profiles.findOne({ uid: profileID });
    let currentBlocked = currentProfile!.blocked.map((p: any) => p.uid);
    let blocked = profile!.blocked.map((p: any) => p.uid);

    // Check if blocked
    if (currentBlocked.includes(profileID) || blocked.includes(uid)) {
      // ctx.response.status = 403;
      ctx.response.body = { message: "Can't like this post.", error: 403 };
      return;
    }

    // Find the post being referenced
    const post = await posts.findOne({ postID: postID });

    if (!post) {
      // ctx.response.status = 404;
      ctx.response.body = { message: 'Referenced post not found.', error: 404 };
      return;
    }

    // Check if post already reacted / not reacted to
    let reacts = post!.reacts.map((r: any) => r.uid);

    if (
      (like === 'true' && reacts.includes(uid)) ||
      (like === 'false' && !reacts.includes(uid))
    ) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: `Post already ${like === 'true' ? '' : 'not'} reacted to.`,
        error: 403,
      };
      return;
    }

    // Update reacts of post in db
    await posts.updateOne(
      { postID: postID },
      {
        $set: {
          reacts:
            like === 'true'
              ? [...post.reacts, { uid: uid }]
              : post.reacts.filter((r) => r.uid !== uid),
        },
      }
    );

    ctx.response.body = {
      posts: `${like === 'true' ? 'R' : 'Unr'}eacted to post successfully!`,
      error: 0,
    };
  }

  async addComment(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const {
      uid,
      profileID,
      postID,
      commentID,
      comment,
      timestamp,
    } = await value;

    if (!uid || !profileID || !postID || !commentID || !comment || !timestamp) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Find list of users blocked
    const currentProfile = await profiles.findOne({ uid: uid });
    const profile = await profiles.findOne({ uid: profileID });
    let currentBlocked = currentProfile!.blocked.map((p: any) => p.uid);
    let blocked = profile!.blocked.map((p: any) => p.uid);

    // Check if blocked
    if (currentBlocked.includes(profileID) || blocked.includes(uid)) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: "Can't comment on this post.",
        error: 403,
      };
      return;
    }

    // Find the post being referenced
    const post = await posts.findOne({ postID: postID });

    if (!post) {
      // ctx.response.status = 404;
      ctx.response.body = { message: 'Referenced post not found.', error: 404 };
      return;
    }

    // Check if post belongs to profileID supplied
    if (post.uid !== profileID) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message:
          "User with the profileID supplied doesn't own the post being refrenced.",
        error: 403,
      };
      return;
    }

    // Ensure no comment with supplied commentID exists
    const existing = post.comments.find((c) => c.commentID === commentID);

    if (existing) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message:
          'Supplied Comment ID already corresponds to an existing comment.',
        error: 403,
      };
      return;
    }

    // Check if current user is a follower
    let followers = profile!.followers.map((f: any) => f.uid);

    if (!followers.includes(uid) && profile!.uid !== uid) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: 'Need to be a follower first.',
        error: 403,
      };
      return;
    }

    // Create a new object for the comment to be posted
    const newComment = {
      uid: uid,
      commentID: commentID,
      comment: comment,
      timestamp: timestamp,
      reacts: [],
    };

    // Update comments of post in db
    await posts.updateOne(
      { postID: postID },
      {
        $set: {
          comments: [...post.comments, newComment],
        },
      }
    );

    ctx.response.body = {
      posts: `Comment successfully posted!`,
      error: 0,
    };
  }

  async editComment(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const {
      uid,
      profileID,
      postID,
      commentID,
      comment,
      timestamp,
    } = await value;

    if (!uid || !profileID || !postID || !commentID || !comment || !timestamp) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Find list of users blocked
    const currentProfile = await profiles.findOne({ uid: uid });
    const profile = await profiles.findOne({ uid: profileID });
    let currentBlocked = currentProfile!.blocked.map((p: any) => p.uid);
    let blocked = profile!.blocked.map((p: any) => p.uid);

    // Check if blocked
    if (currentBlocked.includes(profileID) || blocked.includes(uid)) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: "Can't edit a comment on this post.",
        error: 403,
      };
      return;
    }

    // Find the post being referenced
    const post = await posts.findOne({ postID: postID });

    if (!post) {
      // ctx.response.status = 404;
      ctx.response.body = { message: 'Referenced post not found.', error: 404 };
      return;
    }

    // Check if post belongs to profileID supplied
    if (post.uid !== profileID) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message:
          "User with the profileID supplied doesn't own the post being refrenced.",
        error: 403,
      };
      return;
    }

    // Find the comment being referenced
    const comm = post.comments.find((c) => c.commentID === commentID);

    if (!comm) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'Referenced comment not found.',
        error: 404,
      };
      return;
    }

    // Check if right owner of comment
    if (comm.uid !== uid) {
      // ctx.response.status = 403;
      ctx.response.body = { message: "Can't edit this comment.", error: 403 };
      return;
    }

    // Create new edited object for all the comments
    let editedComments = post.comments.map((c) => {
      if (c.commentID === commentID) {
        return {
          uid: comm.uid,
          commentID: comm.commentID,
          comment: comment,
          timestamp: timestamp,
          reacts: comm.reacts,
        };
      } else {
        return c;
      }
    });

    // Update comments of post in db
    await posts.updateOne(
      { postID: postID },
      {
        $set: {
          comments: editedComments,
        },
      }
    );

    ctx.response.body = {
      posts: `Comment successfully edited!`,
      error: 0,
    };
  }

  async deleteComment(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, profileID, postID, commentID } = await value;

    if (!uid || !profileID || !postID || !commentID) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Find list of users blocked
    const currentProfile = await profiles.findOne({ uid: uid });
    const profile = await profiles.findOne({ uid: profileID });
    let currentBlocked = currentProfile!.blocked.map((p: any) => p.uid);
    let blocked = profile!.blocked.map((p: any) => p.uid);

    // Check if blocked
    if (currentBlocked.includes(profileID) || blocked.includes(uid)) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: "Can't delete this comment.",
        error: 403,
      };
      return;
    }

    // Find the post being referenced
    const post = await posts.findOne({ postID: postID });

    if (!post) {
      // ctx.response.status = 404;
      ctx.response.body = { message: 'Referenced post not found.', error: 404 };
      return;
    }

    // Check if post belongs to profileID supplied
    if (post.uid !== profileID) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message:
          "User with the profileID supplied doesn't own the post being refrenced.",
        error: 403,
      };
      return;
    }

    // Find the comment being referenced
    const comm = post.comments.find((c) => c.commentID === commentID);

    if (!comm) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'Referenced comment not found.',
        error: 404,
      };
      return;
    }

    // Check if right owner of comment
    if (comm.uid !== uid) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: "Can't delete this comment.",
        error: 403,
      };
      return;
    }

    // Remove comment concerned from post in db
    await posts.updateOne(
      { postID: postID },
      {
        $set: {
          comments: post.comments.filter((c) => c.commentID !== commentID),
        },
      }
    );

    ctx.response.body = {
      posts: `Comment successfully deleted!`,
      error: 0,
    };
  }

  async reactComment(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, profileID, postID, commentID, like } = await value;

    if (!uid || !profileID || !postID || !commentID || !like) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Find list of users blocked
    const currentProfile = await profiles.findOne({ uid: uid });
    const profile = await profiles.findOne({ uid: profileID });
    let currentBlocked = currentProfile!.blocked.map((p: any) => p.uid);
    let blocked = profile!.blocked.map((p: any) => p.uid);

    // Check if blocked
    if (currentBlocked.includes(profileID) || blocked.includes(uid)) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: "Can't react to a comment on this post.",
        error: 403,
      };
      return;
    }

    // Find the post being referenced
    const post = await posts.findOne({ postID: postID });

    if (!post) {
      // ctx.response.status = 404;
      ctx.response.body = { message: 'Referenced post not found.', error: 404 };
      return;
    }

    // Check if post belongs to profileID supplied
    if (post.uid !== profileID) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message:
          "User with the profileID supplied doesn't own the post being refrenced.",
        error: 403,
      };
      return;
    }

    // Find the comment being referenced
    const comm = post.comments.find((c) => c.commentID === commentID);

    if (!comm) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'Referenced comment not found.',
        error: 404,
      };
      return;
    }

    // Check if comment already reacted / not reacted to
    let reacts = comm!.reacts.map((r: any) => r.uid);

    if (
      (like === 'true' && reacts.includes(uid)) ||
      (like === 'false' && !reacts.includes(uid))
    ) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: `Comment already ${like === 'true' ? ' ' : 'not'}reacted to.`,
        error: 403,
      };
      return;
    }

    // Create object for the updated comments
    const updatedComments = post.comments.map((c) => {
      if (c.commentID === commentID) {
        return {
          uid: comm.uid,
          commentID: comm.commentID,
          comment: comm.comment,
          timestamp: comm.timestamp,
          reacts:
            like === 'true'
              ? [...comm.reacts, { uid: uid }]
              : comm.reacts.filter((r) => r.uid !== uid),
        };
      } else {
        return c;
      }
    });

    // Remove comment concerned from post in db
    await posts.updateOne(
      { postID: postID },
      {
        $set: {
          comments: updatedComments,
        },
      }
    );

    ctx.response.body = {
      posts: `Successfully ${like === 'true' ? '' : 'un'}reacted to comment!`,
      error: 0,
    };
  }
}

const feedController = new FeedController();
export default feedController;
