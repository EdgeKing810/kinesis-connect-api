import { notifications } from '../components/mongo.ts';

class NotificationController {
  async fetch(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid } = await value;

    if (!uid) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Find user whose uid corresponds to uid
    const u = await notifications.findOne({ uid: uid });

    if (!u) {
      // Create new record and return empty array
      await notifications.insertOne({ uid: uid, notifications: [] });

      ctx.response.body = {
        notifications: [],
        error: 0,
      };
    } else {
      ctx.response.body = {
        notifications: u.notifications,
        error: 0,
      };
    }
  }

  async create(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, notificationID, profileID, type, timestamp } = await value;

    if (!uid || !notificationID || !profileID || !type || !timestamp) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    const data = {
      notificationID,
      profileID,
      type,
      timestamp,
      seen: false,
    };

    // Find user whose uid corresponds to uid
    const u = await notifications.findOne({ uid: uid });

    if (!u) {
      // Create new record and return empty array
      await notifications.insertOne({ uid: uid, notifications: [{ ...data }] });

      ctx.response.body = {
        message: 'Successfully created notification!',
        error: 0,
      };
    } else {
      if (u.notifications.find((n) => n.notificationID === notificationID)) {
        ctx.response.body = {
          message: 'Notification with that notificationID already exists.',
          error: 403,
        };
        return;
      }

      await notifications.updateOne(
        { uid: uid },
        {
          $set: {
            notifications: [...u.notifications, { ...data }],
          },
        }
      );

      ctx.response.body = {
        message: 'Successfully created notification!',
        error: 0,
      };
    }
  }
}

const notificationController = new NotificationController();
export default notificationController;
