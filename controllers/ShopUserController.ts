import { users, shop_users } from '../components/mongo.ts';

class ShopUserController {
  async fetchAll(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid } = await value;

    // Find all users and shop profiles
    const shopUsers: any = await shop_users.find({});
    const allUsers: any = await users.find({});

    // Fetch additional profile details for users
    let sUsers = shopUsers.map((su: any) => {
      const user: any = allUsers.find((u: any) => u.uid === su.uid);

      if (uid && su.uid === uid) {
        return {
          ...su,
          name: user!.name,
        };
      } else {
        return {
          uid: su.uid,
          is_admin: su.is_admin,
          name: user!.name,
        };
      }
    });

    ctx.response.body = { users: sUsers, error: 0 };
  }

  async convertAdmin(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, profileID } = await value;

    if (!uid || !profileID) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Find shop user profiles corresponding to uid and profileID
    const currentUser: any = await shop_users.findOne({ uid: uid });
    const targetUser: any = await shop_users.find({ uid: profileID });

    if (!currentUser || !targetUser) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'User being referenced not found.',
        error: 404,
      };
      return;
    }

    // Check if current user is an admin
    if (!currentUser!.is_admin) {
      // ctx.response.status = 401;
      ctx.response.body = {
        message: 'You need to be an admin first.',
        error: 401,
      };
      return;
    }

    // Check if target user is already an admin
    if (targetUser!.is_admin) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: 'Target user is already an admin.',
        error: 403,
      };
      return;
    }

    // Make user admin
    await shop_users.updateOne(
      { uid: profileID },
      {
        $set: {
          is_admin: true,
        },
      }
    );

    ctx.response.body = {
      message: 'User has successfully been made an admin!',
      error: 0,
    };
  }

  async updateInfo(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const {
      uid,
      preferred_payment,
      country,
      state,
      city,
      address,
      postal_code,
      number,
    } = await value;

    if (
      !uid ||
      !preferred_payment ||
      !country ||
      !state ||
      !city ||
      !address ||
      !postal_code ||
      !number
    ) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Check if valid types and length for number inputs
    if (
      !/^[+\d](?:.*\d)?$/.test(postal_code.toString()) ||
      !/^[+\d](?:.*\d)?$/.test(number.toString()) ||
      postal_code.length !== 5
    ) {
      // ctx.response.status = 400;
      ctx.response.body = {
        message: 'Invalid format for some data supplied.',
        error: 400,
      };
      return;
    }

    // Find shop user profiles corresponding to uid
    const currentUser: any = await shop_users.findOne({ uid: uid });

    if (!currentUser) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'User being referenced not found.',
        error: 404,
      };
      return;
    }

    // Update user info
    await shop_users.updateOne(
      { uid: uid },
      {
        $set: {
          address: {
            country: country ? country : currentUser.country,
            state: state ? state : currentUser.state,
            city: city ? city : currentUser.city,
            address: address ? address : currentUser.address,
            postal_code: postal_code ? postal_code : currentUser.postal_code,
            number: number ? number : currentUser.number,
          },
          preferred_payment: preferred_payment
            ? preferred_payment
            : currentUser.preferred_payment,
        },
      }
    );

    ctx.response.body = {
      message: 'User preferences successfully updated!',
      error: 0,
    };
  }
}

const shopUserController = new ShopUserController();
export default shopUserController;
