import { blog_posts, blog_profiles } from '../components/mongo.ts';

class BlogController {
  async fetchAll(ctx: any) {
    if (!ctx.request.hasBody) return;

    // Find blog posts not marked as Draft
    const blogPosts = await blog_posts.find({
      status: 'PUBLISHED',
    });

    ctx.response.body = { blog_posts: blogPosts, error: 0 };
  }

  async fetchCurrent(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid } = await value;

    if (!uid) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Find blog posts posted by current user
    const blogPosts = await blog_posts.find({
      authorID: uid,
    });

    ctx.response.body = { blog_posts: blogPosts, error: 0 };
  }

  async create(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const {
      uid,
      blogID,
      title,
      subtitle,
      slug,
      preview_img,
      status,
      tags,
      created_on,
      content,
      carousel,
    } = await value;

    if (
      !uid ||
      !blogID ||
      !title ||
      !subtitle ||
      !slug ||
      !status ||
      !tags ||
      !created_on ||
      !content
    ) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Check if blogID unique
    const post = await blog_posts.findOne({
      blogID: blogID,
    });

    if (post) {
      // ctx.response.status = 403;
      ctx.response.body = { message: 'Blog ID should be unique.', error: 403 };
      return;
    }

    // Check if slug unique
    const post2 = await blog_posts.findOne({
      slug: slug,
    });

    if (post2) {
      // ctx.response.status = 403;
      ctx.response.body = { message: 'Slug should be unique.', error: 403 };
      return;
    }

    await blog_posts.insertOne({
      blogID: blogID,
      authorID: uid,
      title: title.slice(0, 40),
      slug: slug,
      subtitle: subtitle.slice(0, 50),
      preview_img: preview_img && preview_img !== undefined ? preview_img : '',
      status: status,
      tags: tags,
      created_on: created_on,
      updated_on: created_on,
      content: content,
      carousel: carousel && carousel !== undefined ? carousel : [],
      views: [],
      likes: [],
      comments: [],
    });

    // Add blog post to list of blog posts for current user
    const currentUser = await blog_profiles.findOne({ uid: uid });

    if (currentUser) {
      await blog_profiles.updateOne(
        { uid: uid },
        {
          $set: {
            blog_posts:
              currentUser.blog_posts !== undefined
                ? [...currentUser.blog_posts, { uid: blogID }]
                : [{ uid: blogID }],
          },
        }
      );
    }

    ctx.response.body = {
      message: 'Blog post successfully created!',
      error: 0,
    };
  }

  async update(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const {
      uid,
      blogID,
      title,
      subtitle,
      preview_img,
      carousel,
      status,
      tags,
      updated_on,
      content,
    } = await value;

    if (
      !uid ||
      !blogID ||
      !updated_on ||
      (!title &&
        !subtitle &&
        !preview_img &&
        !carousel &&
        !status &&
        !tags &&
        !content)
    ) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Check if blog post with blogID exists
    const post = await blog_posts.findOne({
      blogID: blogID,
    });

    if (!post) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: "Blog ID doesn't correspond to any blog post.",
        error: 404,
      };
      return;
    }

    if (post.authorID !== uid) {
      // ctx.response.status = 403;
      ctx.response.body = { message: "Can't edit this blog post.", error: 403 };
      return;
    }

    await blog_posts.updateOne(
      { blogID: blogID },
      {
        $set: {
          title: title && title !== undefined ? title.slice(0, 40) : post.title,
          subtitle:
            subtitle && subtitle !== undefined
              ? subtitle.slice(0, 50)
              : post.subtitle,
          preview_img:
            preview_img && preview_img !== undefined
              ? preview_img
              : post.preview_img,
          carousel:
            carousel && carousel !== undefined ? carousel : post.carousel,
          status: status && status !== undefined ? status : post.status,
          tags: tags && tags !== undefined ? tags : post.tags,
          updated_on:
            updated_on && updated_on !== undefined
              ? updated_on
              : post.updated_on,
          content: content && content !== undefined ? content : post.content,
        },
      }
    );

    ctx.response.body = {
      message: 'Blog post successfully updated!',
      error: 0,
    };
  }

  async delete(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, blogID } = await value;

    if (!uid || !blogID) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Check if blog post with blogID exists
    const post = await blog_posts.findOne({
      blogID: blogID,
    });

    if (!post) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: "Blog ID doesn't correspond to any blog post.",
        error: 404,
      };
      return;
    }

    if (post.authorID !== uid) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: "Can't delete this blog post.",
        error: 403,
      };
      return;
    }

    await blog_posts.deleteOne({ blogID: blogID });

    // Remove blog post from list of blog posts for current user
    const currentUser = await blog_profiles.findOne({ uid: uid });

    if (currentUser) {
      await blog_profiles.updateOne(
        { uid: uid },
        {
          $set: {
            blog_posts:
              currentUser.blog_posts !== undefined
                ? currentUser.blog_posts.filter((p: any) => p.uid !== blogID)
                : [],
          },
        }
      );
    }

    ctx.response.body = {
      message: 'Blog post successfully deleted!',
      error: 0,
    };
  }

  async view(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, slug } = await value;

    if (!uid || !slug) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Check if blog post with slug exists
    const post = await blog_posts.findOne({
      slug: slug,
    });

    if (!post) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: "Slug doesn't correspond to any blog post.",
        error: 404,
      };
      return;
    }

    // Check if current user already viewed this blog post
    const views = post!.views.map((v: any) => v.uid);

    if (views.includes(uid)) {
      // ctx.response.status = 400;
      ctx.response.body = {
        error: 400,
      };
      return;
    }

    await blog_posts.updateOne(
      { slug: slug },
      { $set: { views: [...post.views, { uid: uid }] } }
    );

    ctx.response.body = {
      error: 0,
    };
  }

  async like(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, blogID, like } = await value;

    if (!uid || !blogID || !like) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Check if blog post with blogID exists
    const post = await blog_posts.findOne({
      blogID: blogID,
    });

    if (!post) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: "Blog ID doesn't correspond to any blog post.",
        error: 404,
      };
      return;
    }

    // Check if current user can like/unlike this blog post
    const likes = post!.likes.map((v: any) => v.uid);

    if (
      (like === 'true' && likes.includes(uid)) ||
      (like === 'false' && !likes.includes(uid))
    ) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: `Blog post already ${like === 'true' ? '' : 'un'}liked.`,
        error: 403,
      };
      return;
    }

    await blog_posts.updateOne(
      { blogID: blogID },
      {
        $set: {
          likes:
            like === 'true'
              ? [...post.likes, { uid: uid }]
              : post.likes.filter((l) => l.uid !== uid),
        },
      }
    );

    ctx.response.body = {
      message: `Blog post successfully ${like === 'true' ? '' : 'un'}liked!`,
      error: 0,
    };
  }

  async favorite(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, blogID, favorite } = await value;

    if (!uid || !blogID || !favorite) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Check if blog post with blogID exists
    const post = await blog_posts.findOne({
      blogID: blogID,
    });

    if (!post) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: "Blog ID doesn't correspond to any blog post.",
        error: 404,
      };
      return;
    }

    // Check if user with uid exists
    const user = await blog_profiles.findOne({
      uid: uid,
    });

    if (!user) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: "UID doesn't correspond to any user.",
        error: 404,
      };
      return;
    }

    // Check if current user can favorite/unfavorite this blog post
    const favorites =
      user!.favorites && user!.favorites !== undefined
        ? user!.favorites.map((v: any) => v.uid)
        : [];

    if (
      (favorite === 'true' && favorites.includes(blogID)) ||
      (favorite === 'false' && !favorites.includes(blogID))
    ) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: `Blog post already ${
          favorite === 'true' ? 'added to' : 'not present in'
        } favorites.`,
        error: 403,
      };
      return;
    }

    await blog_profiles.updateOne(
      { uid: uid },
      {
        $set: {
          favorites:
            favorite === 'true'
              ? user.favorites !== undefined
                ? [...user.favorites, { uid: blogID }]
                : [{ uid: blogID }]
              : user.favorites !== undefined
              ? user.favorites.filter((l) => l.uid !== blogID)
              : [],
        },
      }
    );

    ctx.response.body = {
      message: `Blog post successfully ${
        favorite === 'true' ? 'added to' : 'removed from'
      } favorites!`,
      error: 0,
    };
  }

  async addComment(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, blogID, commentID, comment, timestamp } = await value;

    if (!uid || !blogID || !commentID || !comment || !timestamp) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Check if blog post with blogID exists
    const post = await blog_posts.findOne({
      blogID: blogID,
    });

    if (!post) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: "Blog ID doesn't correspond to any blog post.",
        error: 404,
      };
      return;
    }

    // Check if comment with commentID exists
    if (post!.comments.map((c) => c.commentID).includes(commentID)) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: 'Comment with commentID already exists.',
        error: 403,
      };
      return;
    }

    await blog_posts.updateOne(
      { blogID: blogID },
      {
        $set: {
          comments: [
            ...post.comments,
            {
              uid: uid,
              commentID: commentID,
              comment: comment,
              timestamp: timestamp,
              reacts: [],
            },
          ],
        },
      }
    );

    ctx.response.body = {
      message: 'Comment successfully posted!',
      error: 0,
    };
  }

  async editComment(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, blogID, commentID, comment, timestamp } = await value;

    if (!uid || !blogID || !commentID || !comment || !timestamp) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Check if blog post with blogID exists
    const post = await blog_posts.findOne({
      blogID: blogID,
    });
    uid;

    if (!post) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: "Blog ID doesn't correspond to any blog post.",
        error: 404,
      };
      return;
    }

    // Find comment being referenced
    const refComment = post!.comments.find((c) => c.commentID === commentID);

    // Check if comment with commentID exists
    if (!refComment || refComment === undefined) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'Comment with commentID not found.',
        error: 404,
      };
      return;
    }

    // Check if user is owner of comment
    if (refComment.uid !== uid) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: "Can't edit this comment.",
        error: 403,
      };
      return;
    }
    await blog_posts.updateOne(
      { blogID: blogID },
      {
        $set: {
          comments: post!.comments.map((comm: any) => {
            if (comm.commentID === commentID) {
              const updatedComment = { ...comm };

              updatedComment.comment = comment;
              updatedComment.timestamp = timestamp;

              return updatedComment;
            } else {
              return comm;
            }
          }),
        },
      }
    );

    ctx.response.body = {
      message: 'Comment successfully edited!',
      error: 0,
    };
  }

  async deleteComment(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, blogID, commentID } = await value;

    if (!uid || !blogID || !commentID) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Check if blog post with blogID exists
    const post = await blog_posts.findOne({
      blogID: blogID,
    });

    if (!post) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: "Blog ID doesn't correspond to any blog post.",
        error: 404,
      };
      return;
    }

    // Find comment being referenced
    const refComment = post!.comments.find((c) => c.commentID === commentID);

    // Check if comment with commentID exists
    if (!refComment || refComment === undefined) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'Comment with commentID not found.',
        error: 404,
      };
      return;
    }

    // Check if user is owner of comment
    if (refComment.uid !== uid) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: "Can't delete this comment.",
        error: 403,
      };
      return;
    }
    await blog_posts.updateOne(
      { blogID: blogID },
      {
        $set: {
          comments: post!.comments.filter(
            (comm: any) => comm.commentID !== commentID
          ),
        },
      }
    );

    ctx.response.body = {
      message: 'Comment successfully deleted!',
      error: 0,
    };
  }

  async likeComment(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, blogID, commentID, like } = await value;

    if (!uid || !blogID || !commentID || !like) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Check if blog post with blogID exists
    const post = await blog_posts.findOne({
      blogID: blogID,
    });

    if (!post) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: "Blog ID doesn't correspond to any blog post.",
        error: 404,
      };
      return;
    }

    // Check if comment with commentID exists
    if (!post!.comments.map((c) => c.commentID).includes(commentID)) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'Comment with commentID not found.',
        error: 404,
      };
      return;
    }

    // Find comment being referenced
    const refComment = post!.comments.find((c) => c.commentID === commentID);

    // Check if current user can like/unlike this comment
    const likes =
      refComment!.reacts && refComment!.reacts !== undefined
        ? refComment!.reacts.map((l: any) => l.uid)
        : [];

    if (
      (like === 'true' && likes.includes(uid)) ||
      (like === 'false' && !likes.includes(uid))
    ) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: `Comment already ${like === 'true' ? '' : 'un'}liked.`,
        error: 403,
      };
      return;
    }

    await blog_posts.updateOne(
      { blogID: blogID },
      {
        $set: {
          comments: post!.comments.map((comment: any) => {
            if (comment.commentID === commentID) {
              const updatedComment = { ...comment };

              updatedComment.reacts =
                like === 'true'
                  ? updatedComment.reacts !== undefined
                    ? [...updatedComment.reacts, { uid: uid }]
                    : [{ uid: uid }]
                  : updatedComment.reacts !== undefined
                  ? updatedComment.reacts.filter((l: any) => l.uid !== uid)
                  : [];

              return updatedComment;
            } else {
              return comment;
            }
          }),
        },
      }
    );

    ctx.response.body = {
      message: `Comment successfully ${like === 'true' ? '' : 'un'}liked!`,
      error: 0,
    };
  }
}

const blogController = new BlogController();
export default blogController;
