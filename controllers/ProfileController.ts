import { users, profiles } from '../components/mongo.ts';

class ProfileController {
  async fetchAll(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid } = await value;

    if (!uid) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Find all users and profiles that aren't the current user
    const u: any = await users.find({ uid: { $ne: uid } });
    const p: any = await profiles.find({ uid: { $ne: uid } });

    // Remove private details and get only users not having blocked the user
    let formattedUsers: any = [];

    p.forEach((profile: any) => {
      const user: any = u.find((current: any) => profile.uid === current.uid);

      if (
        (profile.blocked === undefined ||
          !profile.blocked.find((b: any) => b.uid === uid)) &&
        user!.active === 'true'
      ) {
        formattedUsers = [
          ...formattedUsers,
          {
            profileID: user.uid,
            name: user.name,
            username: user.username,
            profile_pic: profile.profile_pic,
            bio: profile.bio,
            // followers: profile.followers,
            // following: profile.following,
          },
        ];
      }
    });

    // Return new array of users
    ctx.response.body = {
      users: formattedUsers,
      error: 0,
    };
  }

  async fetch(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, profileID } = await value;

    if (!uid || !profileID) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Find user whose uid corresponds to profileID
    const u = await profiles.findOne({ uid: profileID });

    // Find user details in case same user as uid
    const details = await users.findOne({ uid: uid });

    if (!u) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'Requested user acount not found.',
        error: 404,
      };
      return;
    }

    // Check if requested user corresponds to the one who made the request
    if (uid === profileID) {
      ctx.response.body = {
        name: details!.name,
        username: details!.username,
        email: details!.email,
        roomID: details!.roomID,
        ...u,
        error: 0,
      };
      return;
    } else {
      // Make sure that requested user hasn't blocked the current user
      if (
        u.blocked === undefined ||
        !u.blocked!.find((b: any) => b.uid === uid)
      ) {
        ctx.response.body = {
          bio: u.bio,
          profile_pic: u.profile_pic,
          followers: u.followers,
          following: u.following,
          error: 0,
        };
      } else {
        // ctx.response.status = 401;
        ctx.response.body = {
          message: 'Requested user account is unavailable.',
          error: 401,
        };
      }
    }
  }

  async update(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, bio } = await value;

    if (!uid || !bio) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Find current user
    const u = await profiles.findOne({ uid: uid });

    if (!u) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'User details not found.',
        error: 404,
      };
      return;
    }

    await profiles.updateOne(
      { uid: uid },
      {
        $set: {
          bio: bio,
        },
      }
    );

    ctx.response.body = {
      message: 'Profile updated successfully.',
      error: 0,
    };
  }

  async updateProfilePic(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, profile_pic_url } = await value;

    if (!uid || !profile_pic_url) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Find current user
    const u = await profiles.findOne({ uid: uid });

    if (!u) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'User details not found.',
        error: 404,
      };
      return;
    }

    await profiles.updateOne(
      { uid: uid },
      {
        $set: {
          profile_pic: profile_pic_url,
        },
      }
    );

    ctx.response.body = {
      message: 'Profile picture updated successfully.',
      error: 0,
    };
  }

  async follow(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, profileID, status } = await value;

    if (!uid || !profileID || !status) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Check if same user
    if (uid === profileID) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: `Cannot ${status === 'true' ? '' : 'un'}follow yourself.`,
        error: 403,
      };
      return;
    }

    // Find currentUser
    const u = await profiles.findOne({ uid: uid });

    if (!u) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'Current user not found.',
        error: 404,
      };
      return;
    }

    // Find user whose uid corresponds to profileID
    const f = await profiles.findOne({ uid: profileID });

    if (!f) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'Requested user not found.',
        error: 404,
      };
      return;
    }

    // Make sure requested user hasn't blocked current one
    if (
      f.blocked !== undefined &&
      f.blocked.find((block) => block.uid === uid)
    ) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: `Requested user can't be ${
          status === 'true' ? '' : 'un'
        }followed.`,
        error: 403,
      };
      return;
    }

    // Or that the current user hasn't blocked the requested one
    if (
      u.blocked !== undefined &&
      u.blocked.find((block) => block.uid === profileID)
    ) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: `You blocked the user you're trying to ${
          status === 'true' ? '' : 'un'
        }follow.`,
        error: 403,
      };
      return;
    }

    // Check if user is already being followed (or not)
    if (u.following !== undefined) {
      if (u.following.find((a: any) => a.uid === profileID)) {
        if (status === 'true') {
          // ctx.response.status = 403;
          ctx.response.body = {
            message: 'Already following user.',
            error: 403,
          };
          return;
        }
      } else {
        if (status === 'false') {
          // ctx.response.status = 403;
          ctx.response.body = {
            message: 'User is already not being followed.',
            error: 403,
          };
          return;
        }
      }
    }

    // Update to make sure requested user is now being (un)followed
    await profiles.updateOne(
      { uid: uid },
      {
        $set: {
          following:
            status === 'true'
              ? [...u.following, { uid: profileID }]
              : u.following.filter((field) => field.uid !== profileID),
        },
      }
    );

    // Update to make sure user is(n't) a follower
    await profiles.updateOne(
      { uid: profileID },
      {
        $set: {
          followers:
            status === 'true'
              ? [...f.followers, { uid: uid }]
              : f.followers.filter((field) => field.uid !== uid),
        },
      }
    );

    ctx.response.body = {
      message: `User ${status === 'true' ? '' : 'un'}followed successfully.`,
      error: 0,
    };
  }

  async block(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, profileID, status } = await value;

    if (!uid || !profileID || !status) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Check if same user
    if (uid === profileID) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: `Cannot ${status === 'true' ? '' : 'un'}block yourself.`,
        error: 403,
      };
      return;
    }

    // Find currentUser
    const u = await profiles.findOne({ uid: uid });

    if (!u) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'Current user not found.',
        error: 404,
      };
      return;
    }

    // Find user whose uid corresponds to profileID
    const f = await profiles.findOne({ uid: profileID });

    if (!f) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'Requested user not found.',
        error: 404,
      };
      return;
    }

    // Make sure requested user hasn't blocked current one
    if (
      f.blocked !== undefined &&
      f.blocked.find((block) => block.uid === uid)
    ) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: `Requested user can't be ${
          status === 'true' ? '' : 'un'
        }blocked.`,
        error: 403,
      };
      return;
    }

    // Check if user is already being blocked (or not)
    if (u.blocked !== undefined) {
      if (u.blocked.find((a: any) => a.uid === profileID)) {
        if (status === 'true') {
          // ctx.response.status = 403;
          ctx.response.body = {
            message: 'User already blocked.',
            error: 403,
          };
          return;
        }
      } else {
        if (status === 'false') {
          // ctx.response.status = 403;
          ctx.response.body = {
            message: 'User already not blocked.',
            error: 403,
          };
          return;
        }
      }
    }

    // Remove chat rooms in common if user's going to be blocked
    let uChats = [...u.chats];
    let uChats_cpy = [...u.chats];
    let fChats = [...f.chats];

    if (status === 'true') {
      uChats = uChats.filter(
        (val) => fChats.findIndex((v) => val.uid === v.uid) === -1
      );
      fChats = fChats.filter(
        (val) => uChats_cpy.findIndex((v) => val.uid === v.uid) === -1
      );
    }

    // Update to make sure requested user is now being (un)blocked
    await profiles.updateOne(
      { uid: uid },
      {
        $set: {
          followers:
            status === 'true'
              ? u.followers.filter((field) => field.uid !== profileID)
              : [...u.followers],
          following:
            status === 'true'
              ? u.following.filter((field) => field.uid !== profileID)
              : [...u.following],
          blocked:
            status === 'true'
              ? [...u.blocked, { uid: profileID }]
              : u.blocked.filter((field) => field.uid !== profileID),
          chats: uChats,
        },
      }
    );

    // Update to make sure user is(n't) a follower / following anymore
    await profiles.updateOne(
      { uid: profileID },
      {
        $set: {
          followers:
            status === 'true'
              ? f.followers.filter((field) => field.uid !== uid)
              : [...f.followers],
          following:
            status === 'true'
              ? f.following.filter((field) => field.uid !== uid)
              : [...f.following],
          chats: fChats,
        },
      }
    );

    ctx.response.body = {
      message: `User successfully ${status === 'true' ? '' : 'un'}blocked.`,
      error: 0,
    };
  }

  async upload(ctx: any) {
    const file = ctx.uploadedFiles;
    ctx.response.body = { ...file.file, error: 0 };
  }
}

const profileController = new ProfileController();
export default profileController;
