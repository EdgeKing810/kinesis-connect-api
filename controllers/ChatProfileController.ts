import {
  hashSync,
  compareSync,
  create,
  getNumericDate,
  config,
  v4,
} from '../deps.ts';

import { chat_profiles } from '../components/mongo.ts';

class ChatProfileController {
  async fetchUsers(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid } = await value;

    if (!uid) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Find all users
    let users = await chat_profiles.find();

    // Check if current user exists
    if (!users.map((u: any) => u.uid).includes(uid)) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'No user with that uid found.',
        error: 404,
      };
      return;
    }

    // Filter out some information from users
    users = users.map((user: any) => {
      if (user!.uid === uid) {
        return { ...user };
      } else {
        return {
          uid: user!.uid,
          name: user!.name,
          username: user!.username,
          bio: user!.bio,
          profile_pic: user!.profile_pic,
        };
      }
    });

    ctx.response.body = {
      users: users,
      error: 0,
    };
  }

  async login(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { username, password } = await value;

    if (!username || !password) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Check if user exists
    const user = await chat_profiles.findOne({ username });
    if (!user) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'No user with that username found.',
        error: 404,
      };
      return;
    }

    // Verify if correct password supplied
    if (!compareSync(password, user.password)) {
      // ctx.response.status = 401;
      ctx.response.body = { message: 'Incorrect Password.', error: 401 };
      return;
    }

    const key = config().CHAT_SECRET_KEY!;

    const header: any = {
      alg: 'HS512',
      typ: 'JWT',
    };

    const payload: any = {
      iss: JSON.stringify({ username: user!.username }),
      exp: getNumericDate(new Date().getTime() + 120000),
    };

    const jwt = await create(header, payload, key);

    ctx.response.body = {
      ...user,
      jwt: jwt,
      error: 0,
    };
  }

  async register(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { name, username, password } = await value;

    if (!name || !username || !password) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Find all users
    const users: any = await chat_profiles.find();

    // Check if supplied username is already in use
    let usernames = users.map((u: any) => u.username.toLowerCase());
    const u = usernames.includes(username.toLowerCase());

    if (u) {
      // ctx.response.status = 401;
      ctx.response.body = {
        message: 'Username is already in use.',
        error: 401,
      };
      return;
    }

    // Check if name is valid
    if (!/^[a-zA-Z ]+$/.test(name)) {
      // ctx.response.status = 400;
      ctx.response.body = { messsage: 'Invalid Name.', error: 400 };
      return;
    }

    // Check if username is valid
    if (username) {
      if (!/^[a-zA-Z0-9]+$/.test(username)) {
        // ctx.response.status = 400;
        ctx.response.body = { messsage: 'Invalid Username.', error: 400 };
        return;
      }
    }

    // Check if password is valid
    const lowercase = new RegExp('^(?=.*[a-z])');
    const uppercase = new RegExp('^(?=.*[A-Z])');
    const number = new RegExp('^(?=.*[0-9])');

    const tmpPass: string = password;
    if (
      !(
        lowercase.test(tmpPass) &&
        uppercase.test(tmpPass) &&
        number.test(tmpPass) &&
        password.length >= 8
      )
    ) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid Password.', error: 400 };
      return;
    }

    const d = new Date();
    const timestamp = new Date(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
      d.getUTCHours(),
      d.getUTCMinutes(),
      d.getUTCSeconds()
    );

    // Add the new user to the database
    const newUser = {
      uid: v4.generate(),
      name: name,
      username: username,
      password: hashSync(password),
      bio: "Hey, I'm using Kinesis Chat!",
      created_on: timestamp,
      profile_pic: '',
      contacts: [],
      received_requests: [],
      sent_requests: [],
      blocked: [],
      has_been_blocked: [],
    };

    await chat_profiles.insertOne({ ...newUser });

    ctx.response.body = {
      ...newUser,
      message: `User ${username} successfully registered!`,
      error: 0,
    };
  }

  async update(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const {
      uid,
      name,
      username,
      password,
      old_password,
      bio,
      profile_pic,
    } = await value;

    if (
      !uid ||
      !old_password ||
      (!name && !username && !password && !bio && !profile_pic)
    ) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Find the user with the uid supplied
    const user = await chat_profiles.findOne({ uid: uid });

    if (!user) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'No user with that uid found.',
        error: 404,
      };
      return;
    }

    // Check if old password is correct
    if (!compareSync(old_password, user.password)) {
      // ctx.response.status = 401;
      ctx.response.body = { message: 'Current Password Invalid.', error: 401 };
      return;
    }

    // Check if name is valid
    if (name) {
      if (!/^[a-zA-Z ]+$/.test(name)) {
        // ctx.response.status = 400;
        ctx.response.body = { message: 'Invalid Name.', error: 400 };
        return;
      }
    }

    // Check if desired username is not being used
    if (username) {
      if (user.username !== username) {
        // Find all users
        const users = await chat_profiles.find();

        // Check if username in use
        let usernames: any = users.map((u) => u.username.toLowerCase());

        if (usernames.includes(username.toLowerCase())) {
          // ctx.response.status = 401;
          ctx.response.body = {
            message: 'Username is already in use.',
            error: 401,
          };
          return;
        }
      }

      // Check if desired username is valid
      if (!/^[a-zA-Z0-9]+$/.test(username)) {
        // ctx.response.status = 400;
        ctx.response.body = { messsage: 'Invalid Username.', error: 400 };
        return;
      }
    }

    // Check if new password is valid
    if (password) {
      const lowercase = new RegExp('^(?=.*[a-z])');
      const uppercase = new RegExp('^(?=.*[A-Z])');
      const number = new RegExp('^(?=.*[0-9])');

      const tmpPass: string = password;
      if (
        !(
          lowercase.test(tmpPass) &&
          uppercase.test(tmpPass) &&
          number.test(tmpPass) &&
          password.length >= 8
        )
      ) {
        // ctx.response.status = 400;
        ctx.response.body = { message: 'Invalid Password.', error: 400 };
        return;
      }
    }

    // Check if new bio is valid
    if (bio) {
      if (bio.length <= 0) {
        // ctx.response.status = 400;
        ctx.response.body = { message: 'Bio too short.', error: 400 };
        return;
      }
    }

    // Save the updated fields for the user
    await chat_profiles.updateOne(
      { uid: uid },
      {
        $set: {
          name: name ? name : user.name,
          username: username ? username : user.username,
          password: hashSync(password ? password : old_password),
          bio: bio ? bio : user.bio,
          profile_pic:
            profile_pic !== undefined ? profile_pic : user.profile_pic,
        },
      }
    );

    ctx.response.body = {
      message: `User ${
        username ? username : user.username
      } successfully updated!`,
      error: 0,
    };
  }

  async sendRequest(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, profileID, send } = await value;

    if (!uid || !profileID || !send) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Find the user with the uid supplied
    const user = await chat_profiles.findOne({ uid: uid });

    if (!user) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'No user with that uid found.',
        error: 404,
      };
      return;
    }

    // Find the user with the profileID supplied
    const targetUser = await chat_profiles.findOne({ uid: profileID });

    if (!targetUser) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'No user with that profileID found.',
        error: 404,
      };
      return;
    }

    // Check if uid and profileID are different
    if (uid === profileID) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: 'UID and profileID should be different.',
        error: 403,
      };
      return;
    }

    // Check if target user blocked current user or vice versa
    const blocked = user.blocked.map((b: any) => b.uid);
    const targetBlocked = targetUser.blocked.map((b: any) => b.uid);

    if (blocked.includes(profileID) || targetBlocked.includes(uid)) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: "Can't send or unsend a request to this user.",
        error: 403,
      };
      return;
    }

    // Check if user has already accepted that request
    const contacts =
      user.contacts.length > 0 ? user.contacts.map((c: any) => c.uid) : [];

    if (contacts.length > 0 && contacts.includes(profileID)) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: 'User has already accepted a request from you.',
        error: 403,
      };
      return;
    }

    // Check if user has already been sent a request or not
    const sentRequests =
      user.sent_requests.length > 0
        ? user.sent_requests.map((r: any) => r!.uid)
        : [];

    if (send === 'true' && sentRequests.includes(profileID)) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: 'User has already been sent a request.',
        error: 403,
      };
      return;
    } else if (
      send === 'false' &&
      (sentRequests.length <= 0 || !sentRequests.includes(profileID))
    ) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: 'User has not been sent a request yet.',
        error: 403,
      };
      return;
    }

    // Save the updated fields for the user
    await chat_profiles.updateOne(
      { uid: uid },
      {
        $set: {
          sent_requests:
            send === 'true'
              ? user.sent_requests.length > 0
                ? [{ uid: profileID }, ...user.sent_requests]
                : [{ uid: profileID }]
              : user.sent_requests.filter((r: any) => r!.uid !== profileID),
        },
      }
    );

    // Save the updated fields for the targetUser
    await chat_profiles.updateOne(
      { uid: profileID },
      {
        $set: {
          received_requests:
            send === 'true'
              ? targetUser.received_requests.length > 0
                ? [{ uid: uid }, ...targetUser.received_requests]
                : [{ uid: uid }]
              : targetUser.received_requests.filter((r: any) => r!.uid !== uid),
        },
      }
    );

    ctx.response.body = {
      message: `User successfully ${
        send === 'true' ? '' : 'un'
      }sent a request!`,
      error: 0,
    };
  }

  async acceptRequest(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, profileID, accept } = await value;

    if (!uid || !profileID || !accept) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Find the user with the uid supplied
    const user = await chat_profiles.findOne({ uid: uid });

    if (!user) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'No user with that uid found.',
        error: 404,
      };
      return;
    }

    // Find the user with the profileID supplied
    const targetUser = await chat_profiles.findOne({ uid: profileID });

    if (!targetUser) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'No user with that profileID found.',
        error: 404,
      };
      return;
    }

    // Check if uid and profileID are different
    if (uid === profileID) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: 'UID and profileID should be different.',
        error: 403,
      };
      return;
    }

    // Check if target user blocked current user or vice versa
    const blocked = user.blocked.map((b: any) => b.uid);
    const targetBlocked = targetUser.blocked.map((b: any) => b.uid);

    if (blocked.includes(profileID) || targetBlocked.includes(uid)) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: "Can't accept or reject a request from this user.",
        error: 403,
      };
      return;
    }

    // Check if user has already received a request or not
    const receivedRequests =
      user.received_requests.length > 0
        ? user.received_requests.map((r: any) => r!.uid)
        : [];

    if (receivedRequests.length <= 0 || !receivedRequests.includes(profileID)) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: 'No requests from this user exist.',
        error: 403,
      };
      return;
    }

    // Save the updated fields for the user
    await chat_profiles.updateOne(
      { uid: uid },
      {
        $set: {
          received_requests: user.received_requests.filter(
            (r: any) => r!.uid !== profileID
          ),
          contacts:
            accept === 'true'
              ? user.contacts.length > 0
                ? [
                    ...user.contacts,
                    { uid: profileID, nickname: targetUser.name },
                  ]
                : [{ uid: profileID, nickname: targetUser.name }]
              : [...user.contacts],
        },
      }
    );

    // Save the updated fields for the targetUser
    await chat_profiles.updateOne(
      { uid: profileID },
      {
        $set: {
          sent_requests: targetUser.sent_requests.filter(
            (r: any) => r!.uid !== uid
          ),
          contacts:
            accept === 'true'
              ? targetUser.contacts.length > 0
                ? [...targetUser.contacts, { uid: uid, nickname: user.name }]
                : [{ uid: uid, nickname: user.name }]
              : [...targetUser.contacts],
        },
      }
    );

    ctx.response.body = {
      message: `Successfully ${
        accept === 'true' ? 'accepted' : 'rejected'
      } the request.`,
      error: 0,
    };
  }

  async removeContact(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, profileID } = await value;

    if (!uid || !profileID) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Find the user with the uid supplied
    const user = await chat_profiles.findOne({ uid: uid });

    if (!user) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'No user with that uid found.',
        error: 404,
      };
      return;
    }

    // Find the user with the profileID supplied
    const targetUser = await chat_profiles.findOne({ uid: profileID });

    if (!targetUser) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'No user with that profileID found.',
        error: 404,
      };
      return;
    }

    // Check if uid and profileID are different
    if (uid === profileID) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: 'UID and profileID should be different.',
        error: 403,
      };
      return;
    }

    // Check if target user blocked current user or vice versa
    const blocked = user.blocked.map((b: any) => b.uid);
    const targetBlocked = targetUser.blocked.map((b: any) => b.uid);

    if (blocked.includes(profileID) || targetBlocked.includes(uid)) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: 'User is already not a contact. #b',
        error: 403,
      };
      return;
    }

    // Check if user is a contact or not
    const contacts =
      user.contacts.length > 0 ? user.contacts.map((c: any) => c!.uid) : [];

    if (contacts.length <= 0 || !contacts.includes(profileID)) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: 'User is already not a contact. #n',
        error: 403,
      };
      return;
    }

    // Save the updated fields for the user
    await chat_profiles.updateOne(
      { uid: uid },
      {
        $set: {
          contacts: user.contacts.filter((c: any) => c!.uid !== profileID),
        },
      }
    );

    // Save the updated fields for the targetUser
    await chat_profiles.updateOne(
      { uid: profileID },
      {
        $set: {
          contacts: targetUser.contacts.filter((c: any) => c!.uid !== uid),
        },
      }
    );

    ctx.response.body = {
      message: `Successfully removed from contacts.`,
      error: 0,
    };
  }

  async blockContact(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, profileID, block } = await value;

    if (!uid || !profileID || !block) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Find the user with the uid supplied
    const user = await chat_profiles.findOne({ uid: uid });

    if (!user) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'No user with that uid found.',
        error: 404,
      };
      return;
    }

    // Find the user with the profileID supplied
    const targetUser = await chat_profiles.findOne({ uid: profileID });

    if (!targetUser) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'No user with that profileID found.',
        error: 404,
      };
      return;
    }

    // Check if target user blocked current user or vice versa
    const blocked = user.blocked.map((b: any) => b.uid);

    if (block === 'true' && blocked.includes(profileID)) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: 'User has already been blocked.',
        error: 403,
      };
      return;
    } else if (block === 'false' && !blocked.includes(profileID)) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: 'User is already not blocked.',
        error: 403,
      };
      return;
    }

    // Save the updated fields for the user
    await chat_profiles.updateOne(
      { uid: uid },
      {
        $set: {
          blocked:
            block === 'true'
              ? user.blocked.length > 0
                ? [...user.blocked, { uid: profileID }]
                : [{ uid: profileID }]
              : user.blocked.filter((b: any) => b!.uid !== profileID),
          received_requests:
            block === 'true'
              ? user.received_requests.filter((r: any) => r.uid !== profileID)
              : user.received_requests,
        },
      }
    );

    // Save the updated fields for the target user
    await chat_profiles.updateOne(
      { uid: profileID },
      {
        $set: {
          has_been_blocked:
            block === 'true'
              ? targetUser.has_been_blocked.length > 0
                ? [...targetUser.has_been_blocked, { uid: uid }]
                : [{ uid: uid }]
              : targetUser.has_been_blocked.filter((b: any) => b!.uid !== uid),
          sent_requests:
            block === 'true'
              ? targetUser.sent_requests.filter((r: any) => r.uid !== uid)
              : targetUser.sent_requests,
        },
      }
    );

    ctx.response.body = {
      message: `Successfully ${block === 'true' ? '' : 'un'}blocked user.`,
      error: 0,
    };
  }

  async updateContact(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, profileID, nickname } = await value;

    if (!uid || !profileID || !nickname) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Find the user with the uid supplied
    const user = await chat_profiles.findOne({ uid: uid });

    if (!user) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'No user with that uid found.',
        error: 404,
      };
      return;
    }

    // Find the user with the profileID supplied
    const targetUser = await chat_profiles.findOne({ uid: profileID });

    if (!targetUser) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'No user with that profileID found.',
        error: 404,
      };
      return;
    }

    // Check if uid and profileID are different
    if (uid === profileID) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: 'UID and profileID should be different.',
        error: 403,
      };
      return;
    }

    // Check if user is a contact or not
    const contacts =
      user.contacts.length > 0 ? user.contacts.map((c: any) => c!.uid) : [];

    if (contacts.length <= 0 || !contacts.includes(profileID)) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: 'User is not a contact.',
        error: 403,
      };
      return;
    }

    // Save the updated fields for the user
    await chat_profiles.updateOne(
      { uid: uid },
      {
        $set: {
          contacts: user.contacts.map((c: any) => {
            if (c!.uid === profileID) {
              const updatedContact = { ...c };
              c!.nickname = nickname;
              return updatedContact;
            } else {
              return c;
            }
          }),
        },
      }
    );

    ctx.response.body = {
      message: `Successfully updated nickname.`,
      error: 0,
    };
  }
}

const chatProfileController = new ChatProfileController();
export default chatProfileController;
