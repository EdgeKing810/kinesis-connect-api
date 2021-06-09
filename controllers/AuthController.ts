import {
  hashSync,
  compareSync,
  v4,
  create,
  getNumericDate,
  config,
  SmtpClient,
} from '../deps.ts';

import {
  users,
  profiles,
  posts,
  chats,
  blog_profiles,
  blog_posts,
  shop_users,
} from '../components/mongo.ts';

class AuthController {
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
    const user = await users.findOne({ username });
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

    // Verify and fix user uid if in wrong format
    let uid: string = user.uid;

    if (uid === undefined || uid === null || uid.length < 3) {
      uid = v4.generate();
    }

    // Verify and fix user roomID if in wrong format
    let roomID: string = user.roomID;

    if (roomID === undefined || roomID === null || roomID.length < 3) {
      roomID = v4.generate();
    }

    let updatedUser: any = {
      uid: uid,
      active: user.active,
      token: user.token,
      name: user.name,
      username: user.username,
      email: user.email,
      password: user.password,
      roomID: roomID,
    };

    // Update and save user details
    await users.updateOne({ email: user.email }, { $set: updatedUser });

    const profile = await profiles.findOne({ uid: updatedUser.uid });

    // Make a formatted object of details to be returned
    const formattedUser = {
      uid: updatedUser.uid,
      name: updatedUser.name,
      email: updatedUser.email,
      roomID: updatedUser.roomID,
      bio: profile!.bio,
      profile_pic: profile!.profile_pic,
      followers: profile!.followers,
      following: profile!.following,
      chats: profile!.chats,
      blocked: profile!.blocked,
    };

    // Check if user account is already activated
    if (user.active !== 'true') {
      // ctx.response.status = 403;
      ctx.response.body = { message: 'Account Activation Needed.', error: 403 };
      return;
    }

    // Create a blog profile if user doesn't already have one
    const blog_profile = await blog_profiles.findOne({ uid: uid });

    if (!blog_profile) {
      await blog_profiles.insertOne({
        uid: uid,
        blog_description: '',
        banner_img: '',
        blog_posts: [],
        blog_followers: [],
        favorites: [],
        notifications: [],
      });
    }

    // Create a shop profile if user doesn't already have one
    const shop_user = await shop_users.findOne({ uid: uid });

    if (!shop_user) {
      await shop_users.insertOne({
        uid: uid,
        address: {
          country: '',
          state: '',
          city: '',
          address: '',
          postal_code: '',
          number: '',
        },
        preferred_payment: '',
        is_admin: false,
      });
    }

    const key = config().SECRET_KEY!;

    const header: any = {
      alg: 'HS512',
      typ: 'JWT',
    };

    const payload: any = {
      iss: JSON.stringify({ email: formattedUser.email }),
      exp: getNumericDate(new Date().getTime() + 120000),
    };

    const jwt = await create(header, payload, key);

    ctx.response.body = {
      ...formattedUser,
      jwt: jwt,
      error: 0,
    };
  }

  async register(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { name, username, email, password } = await value;

    if (!name || !username || !email || !password) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Find all users
    const usr: any = await users.find();

    // Check if supplied email is already in use
    let emails = usr.map((u: any) => u.email.toLowerCase());
    const e = emails.includes(email.toLowerCase());

    if (e) {
      // ctx.response.status = 401;
      ctx.response.body = { message: 'Email is already in use.', error: 401 };
      return;
    }

    // Check if supplied username is already in use
    let usernames = usr.map((u: any) => u.username.toLowerCase());
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

    // Check if email is valid
    if (
      !/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
        email
      )
    ) {
      // ctx.response.status = 400;
      ctx.response.body = { messsage: 'Invalid Email Address.', error: 400 };
      return;
    }

    // Check if password is valid
    const lowercase = new RegExp('^(?=.*[a-z])');
    const uppercase = new RegExp('^(?=.*[A-Z])');
    const number = new RegExp('^(?=.*[0-9])');
    const symbol = new RegExp('^(?=.*[!@#$%^&*])');

    const tmpPass: string = password;
    if (
      !(
        lowercase.test(tmpPass) &&
        uppercase.test(tmpPass) &&
        number.test(tmpPass) &&
        symbol.test(tmpPass) &&
        password.length >= 8
      )
    ) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid Password.', error: 400 };
      return;
    }

    // Send an email for  verification
    const client = new SmtpClient();
    const SMTP_USER = config().SMTP_USER;
    const SMTP_PASS = config().SMTP_PASSWORD;

    const connectConfig: any = {
      hostname: config().SMTP_SERVER,
      port: config().SMTP_PORT,
      username: SMTP_USER,
      password: SMTP_PASS,
    };
    await client.connect(connectConfig);

    const token = v4.generate();

    await client.send({
      from: SMTP_USER,
      to: email,
      subject: 'Activation of your Kinesis Connect Account',
      content: `<div style="background-color: #4a5568; padding: 2em;"><h1 style="color: #90cdf4">Hey there, ${username}!</h1></br><p style="color: white;">To activate your <a href="https://connect.kinesis.games/" style="color: #63b3ed;">Kinesis Connect</a> account, please click on the following link:</p><p style="color: #faf089;">https://api.connect.kinesis.games/api/user/activate/${username}/${token}</p><p style="color: white;">This is an automatic response generated when you sign up for a new <a href="https://connect.kinesis.games/" style="color: #63b3ed;">Kinesis Connect</a> account. Please do not reply to this email.</p></div>`,
    });

    await client.close();

    const uid = v4.generate();

    // Add the new user to the database
    await users.insertOne({
      uid: uid,
      active: 'false',
      token: token,
      name: name,
      username: username,
      email: email,
      password: hashSync(password),
      roomID: v4.generate(),
    });

    // Create the equivalent profile
    await profiles.insertOne({
      uid: uid,
      bio: '',
      profile_pic: '',
      followers: [],
      following: [],
      chats: [],
      blocked: [],
    });

    ctx.response.body = {
      message: `User ${username} successfully registered!`,
      error: 0,
    };
  }

  async update(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, name, username, password, old_password } = await value;

    if (!uid || !old_password || (!name && !username && !password)) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Find the user with the uid supplied
    const user = await users.findOne({ uid: uid });

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
        const usr = await users.find();

        // Check if username in use
        let usernames: any = usr.map((u) => u.username.toLowerCase());
        const u = usernames.includes(username.toLowerCase());

        if (u) {
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
      const symbol = new RegExp('^(?=.*[!@#$%^&*])');

      const tmpPass: string = password;
      if (
        !(
          lowercase.test(tmpPass) &&
          uppercase.test(tmpPass) &&
          number.test(tmpPass) &&
          symbol.test(tmpPass) &&
          password.length >= 8
        )
      ) {
        // ctx.response.status = 400;
        ctx.response.body = { message: 'Invalid Password.', error: 400 };
        return;
      }
    }

    // Save the updated fields for the user
    await users.updateOne(
      { uid: uid },
      {
        $set: {
          name: name ? name : user.name,
          username: username ? username : user.username,
          password: hashSync(password ? password : old_password),
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

  async delete(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, password } = await value;

    if (!uid || !password) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Find the user corresponding to the uid supplied
    const user = await users.findOne({ uid: uid });
    if (!user) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'No user with that uid found.',
        error: 404,
      };
      return;
    }

    // Check if password correct
    if (!compareSync(password, user.password)) {
      // ctx.response.status = 401;
      ctx.response.body = { message: 'Incorrect Password.', error: 401 };
      return;
    }

    // Delete the user
    await users.deleteOne({ uid: user.uid });
    await profiles.deleteOne({ uid: user.uid });
    await posts.deleteMany({ uid: user.uid });
    await blog_profiles.deleteOne({ uid: user.uid });
    await blog_posts.deleteMany({ authorID: user.uid });

    // Delete all messages by user as well
    const messages = await chats.find();
    const updatedMessages: any = [];

    messages.forEach((m) => {
      const members = m.members.map((mem) => mem.uid);

      if (!members.includes(user.uid)) {
        updatedMessages.push(m);
      }
    });

    await chats.updateMany({}, updatedMessages);

    ctx.response.body = {
      message: 'Account deleted successfully.',
      error: 0,
    };
  }

  async activate(ctx: any) {
    const { username, token } = ctx.params;

    const user = await users.findOne({ username: username });

    if (!user) {
      // ctx.response.status = 404;
      ctx.response.body = { message: "Account doesn't exist.", error: 404 };
      return;
    }

    // Check if the token matches that in the database or if account is already activated
    if (user.token !== token || user.active === 'true') {
      ctx.response.body = {
        message: 'Account already activated or Invalid Token.',
        error: 400,
      };
      return;
    }

    // Set user to have an activated account
    user.active = 'true';
    await users.updateOne({ username: username }, { $set: user });
    ctx.response.body = {
      message: 'Account successfully activated! You may now login.',
      error: 0,
    };
    ctx.response.redirect('https://connect.kinesis.games');
  }
}

const authController = new AuthController();
export default authController;
