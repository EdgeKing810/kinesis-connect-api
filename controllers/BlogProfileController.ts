import { users, profiles, blog_profiles } from '../components/mongo.ts';

class BlogProfileController {
  async fetchAll(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid } = await value;

    // Find all blog profiles
    const bProfiles = await blog_profiles.find({});

    const allUsers: any = await users.find({});
    const allProfiles: any = await profiles.find({});

    // Fetch additional profile details for users
    let bUsers = bProfiles.map((pr: any) => {
      const user: any = allUsers.find((u: any) => u.uid === pr.uid);
      const profile: any = allProfiles.find((p: any) => p.uid === pr.uid);

      if (uid && pr.uid === uid) {
        return {
          ...pr,
          blog_followers_amount:
            pr.blog_followers && pr.blog_followers !== undefined
              ? pr.blog_followers.length
              : 0,
          blog_following_amount:
            pr.blog_following && pr.blog_following !== undefined
              ? pr.blog_following.length
              : 0,
          name: user!.name,
          username: user!.username,
          profile_pic: profile!.profile_pic,
          banner_img: pr.banner_img,
        };
      } else {
        return {
          blog_description: pr.blog_description,
          blog_posts: pr.blog_posts,
          blog_followers_amount:
            pr.blog_followers && pr.blog_followers !== undefined
              ? pr.blog_followers.length
              : 0,
          blog_following_amount:
            pr.blog_following && pr.blog_following !== undefined
              ? pr.blog_following.length
              : 0,
          uid: pr.uid,
          name: user!.name,
          username: user!.username,
          profile_pic: profile!.profile_pic,
          banner_img: pr.banner_img,
        };
      }
    });

    ctx.response.body = { users: bUsers, error: 0 };
  }

  async updateDesc(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, description, banner_img } = await value;

    if (!uid || (!description && !banner_img)) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Find blog profile
    const profile = await blog_profiles.findOne({ uid: uid });

    if (!profile) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'User profile not found.',
        error: 404,
      };
      return;
    }

    await blog_profiles.updateOne(
      { uid: uid },
      {
        $set: {
          blog_description:
            description && description !== undefined
              ? description
              : profile.blog_description,
          banner_img:
            banner_img && banner_img !== undefined
              ? banner_img
              : profile.banner_img,
        },
      }
    );

    ctx.response.body = {
      message: `Blog ${
        description ? 'description' : 'banner image'
      } updated successfully!`,
      error: 0,
    };
  }

  async follow(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, authorID, follow } = await value;

    if (!uid || !authorID || !follow) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Find blog profile of current user
    const profile = await blog_profiles.findOne({ uid: uid });

    if (!profile) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: "Current user's profile not found.",
        error: 404,
      };
      return;
    }

    // Find blog profile of requested user
    const userProfile = await blog_profiles.findOne({ uid: authorID });

    if (!userProfile) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: "Requested user's profile not found.",
        error: 404,
      };
      return;
    }

    // Check if can current user can follow/unfollow the requested user
    const following =
      profile!.blog_following && profile!.blog_following !== undefined
        ? profile!.blog_following.map((f: any) => f.uid)
        : [];

    if (
      (follow === 'true' && following.includes(authorID)) ||
      (follow === 'false' && !following.includes(authorID))
    ) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: `User already${
          follow === 'true' ? '' : ' not'
        } being followed.`,
        error: 403,
      };
      return;
    }

    await blog_profiles.updateOne(
      { uid: uid },
      {
        $set: {
          blog_following:
            follow === 'true'
              ? profile!.blog_following !== undefined
                ? [...profile.blog_following, { uid: authorID }]
                : [{ uid: authorID }]
              : profile!.blog_following !== undefined
              ? profile.blog_following.filter((u: any) => u.uid !== authorID)
              : [],
        },
      }
    );

    await blog_profiles.updateOne(
      { uid: authorID },
      {
        $set: {
          blog_followers:
            follow === 'true'
              ? userProfile!.blog_followers !== undefined
                ? [...userProfile.blog_followers, { uid: uid }]
                : [{ uid: uid }]
              : userProfile!.blog_followers !== undefined
              ? userProfile.blog_followers.filter((u: any) => u.uid !== uid)
              : [],
        },
      }
    );

    ctx.response.body = {
      message: `User ${follow === 'true' ? '' : 'un'}followed successfully!`,
      error: 0,
    };
  }

  async createNotification(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const {
      uid,
      notificationID,
      profileID,
      type,
      linkTo,
      timestamp,
    } = await value;

    if (
      !uid ||
      !notificationID ||
      !profileID ||
      !type ||
      !linkTo ||
      !timestamp
    ) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Find blog profile
    const profile = await blog_profiles.findOne({ uid: profileID });

    if (!profile) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'User profile not found.',
        error: 404,
      };
      return;
    }

    // Create the notification object to be inserted
    const notification = {
      notificationID: notificationID,
      uid: uid,
      type: type,
      linkTo: linkTo,
      timestamp: timestamp,
      seen: false,
    };

    await blog_profiles.updateOne(
      { uid: profileID },
      {
        $set: {
          notifications:
            profile.notifications &&
            profile.notifications !== undefined &&
            profile.notifications.length > 0
              ? [...profile.notifications, { ...notification }]
              : [{ ...notification }],
        },
      }
    );

    ctx.response.body = {
      message: 'Notification successfully sent!',
      error: 0,
    };
  }

  async readNotification(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, notificationID, read } = await value;

    if (!uid || !notificationID || !read) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Find blog profile
    const profile = await blog_profiles.findOne({ uid: uid });

    if (!profile) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'User profile not found.',
        error: 404,
      };
      return;
    }

    // Find the notification object requested
    const notification =
      profile!.notifications &&
      profile!.notifications !== undefined &&
      profile!.notifications.length > 0
        ? profile!.notifications.find(
            (n: any) => n.notificationID === notificationID
          )
        : null;

    if (!notification) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'Requested notification not found.',
        error: 404,
      };
      return;
    }

    await blog_profiles.updateOne(
      { uid: uid },
      {
        $set: {
          notifications: profile!.notifications.map((n: any) => {
            if (n.notificationID === notificationID) {
              let updatedNotification: any = { ...n };
              updatedNotification.seen = read === 'true';
              return updatedNotification;
            } else {
              return n;
            }
          }),
        },
      }
    );

    ctx.response.body = {
      message: `Notification successfully marked as ${
        read === 'true' ? '' : 'un'
      }read!`,
      error: 0,
    };
  }

  async deleteNotification(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, notificationID } = await value;

    if (!uid || !notificationID) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Find blog profile
    const profile = await blog_profiles.findOne({ uid: uid });

    if (!profile) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'User profile not found.',
        error: 404,
      };
      return;
    }

    // Find the notification object requested
    const notification =
      profile!.notifications &&
      profile!.notifications !== undefined &&
      profile!.notifications.length > 0
        ? profile!.notifications.find(
            (n: any) => n.notificationID === notificationID
          )
        : null;

    if (!notification) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'Requested notification not found.',
        error: 404,
      };
      return;
    }

    await blog_profiles.updateOne(
      { uid: uid },
      {
        $set: {
          notifications: profile!.notifications.filter(
            (n: any) => n!.notificationID !== notificationID
          ),
        },
      }
    );

    ctx.response.body = {
      message: 'Notification successfully deleted.',
      error: 0,
    };
  }
}

const blogProfileController = new BlogProfileController();
export default blogProfileController;
