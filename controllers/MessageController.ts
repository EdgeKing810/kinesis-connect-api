import { profiles, chats } from '../components/mongo.ts';

class MessageController {
  async join(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, roomID, roomName, profileID } = await value;

    if (!uid || !roomID || !roomName || !profileID) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Find current user
    const current = await profiles.findOne({ uid: uid });

    // Find user to whom a message wants to be sent
    const receiver = await profiles.findOne({ uid: profileID });

    // Check if user profiles exist
    if (!current || !receiver) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'User not found.',
        error: 404,
      };
      return;
    }

    // Prevent joining existing room
    const room = await chats.findOne({ room: roomID });

    if (room) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: "Can't join existing room.",
        error: 403,
      };
      return;
    }

    // Check if not blocked
    if (
      (current.blocked !== undefined &&
        current.blocked.find((a: any) => a.uid === profileID)) ||
      (receiver.blocked !== undefined &&
        receiver.blocked.find((b: any) => b.uid === uid))
    ) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: "Can't send a message to this user.",
        error: 403,
      };
      return;
    }

    // Check if not already in chat room
    if (
      current.chats !== undefined &&
      current.chats.find((c: any) => c.uid === roomID)
    ) {
      // ctx.response.status = 400;
      ctx.response.body = {
        message: 'Room already joined or unavailable.',
        error: 400,
      };
      return;
    }

    // Create the chat room
    await chats.insertOne({
      room: roomID,
      members: [{ uid: uid }, { uid: profileID }],
      messages: [],
    });

    // Update the chats for both users
    await profiles.updateOne(
      { uid: uid },
      {
        $set: {
          chats: [...current.chats, { uid: roomID, name: roomName }],
        },
      }
    );

    await profiles.updateOne(
      { uid: profileID },
      {
        $set: {
          chats: [...receiver.chats, { uid: roomID, name: roomName }],
        },
      }
    );

    ctx.response.body = {
      message: `Joined room ${roomID} successfully!`,
      error: 0,
    };
  }

  async fetch(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, roomID } = await value;

    if (!uid || !roomID) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Find room with requested roomID
    const room = await chats.findOne({ room: roomID });

    // Check and respond with an error if no room found
    if (!room) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: "Can't find requested room.",
        error: 404,
      };
      return;
    }

    // Check if user is member of room
    if (
      room.members === undefined ||
      !room.members.find((r) => r.uid === uid)
    ) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: "Can't fetch messages from this room.",
        error: 403,
      };
      return;
    }

    ctx.response.body = { ...room, error: 0 };
  }

  async create(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, roomID, messageID, message, timestamp } = await value;

    if (!uid || !roomID || !messageID || !message || !timestamp) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Find requested room
    const room = await chats.findOne({ room: roomID });

    // Check if room exists
    if (!room) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'Requested room not found.',
        error: 404,
      };
      return;
    }

    // Check if user is member of room
    if (
      room.members === undefined ||
      !room.members.find((r) => r.uid === uid)
    ) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: "Can't send messages in this room.",
        error: 403,
      };
      return;
    }

    // Check if user hasn't already left the room
    const profile = await profiles.findOne({ uid: uid });

    if (
      profile!.chats !== undefined &&
      !profile!.chats.find((c: any) => c.uid === roomID)
    ) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: "Can't send messages in this room anymore.",
        error: 403,
      };
      return;
    }

    // Ensure no message with supplied messageID exists
    const existing = room.messages.find((m) => m.messageID === messageID);

    if (existing) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message:
          'Supplied Message ID already corresponds to an existing message.',
        error: 403,
      };
      return;
    }

    // Create an object based on the characteristics of the new message
    const newMessage = {
      messageID: messageID,
      senderID: uid,
      message: message,
      timestamp: timestamp,
    };

    // Save the new message in the db
    await chats.updateOne(
      { room: roomID },
      {
        $set: {
          messages: [...room.messages, newMessage],
        },
      }
    );

    ctx.response.body = { message: 'Message sent successfully!', error: 0 };
  }

  async update(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, roomID, messageID, message, timestamp } = await value;

    if (!uid || !roomID || !messageID || !message || !timestamp) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Find requested room
    const room = await chats.findOne({ room: roomID });

    // Check if room exists
    if (!room) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: "Can't find requested room.",
        error: 404,
      };
      return;
    }

    // Check if user is member of room
    if (
      room.members === undefined ||
      !room.members.find((r) => r.uid === uid)
    ) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: "Can't edit messages in this room.",
        error: 403,
      };
      return;
    }

    // Check if user hasn't already left the room
    const profile = await profiles.findOne({ uid: uid });

    if (
      profile!.chats !== undefined &&
      !profile!.chats.find((c: any) => c.uid === roomID)
    ) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: "Can't edit messages in this room anymore.",
        error: 403,
      };
      return;
    }

    // Find the message being referenced
    const msg = room.messages.find((m: any) => m.messageID === messageID);

    // Check if message exists
    if (!msg) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: "Message being referenced doesn't exist.",
        error: 404,
      };
      return;
    }

    // Check if sender is current user
    if (msg.senderID !== uid) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: "Can't edit this message.",
        error: 403,
      };
      return;
    }

    // Create an updated object for the messages
    let updatedMessages: any = room.messages.map((m) => {
      if (m.messageID === messageID) {
        return {
          messageID: msg.messageID,
          senderID: msg.senderID,
          message: message,
          timestamp: timestamp,
        };
      } else {
        return m;
      }
    });

    // Save the  updated messages in the db
    await chats.updateOne(
      { room: roomID },
      {
        $set: {
          messages: [...updatedMessages],
        },
      }
    );

    ctx.response.body = { message: 'Message edited successfully!', error: 0 };
  }

  async delete(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, roomID, messageID } = await value;

    if (!uid || !roomID || !messageID) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Find requested room
    const room = await chats.findOne({ room: roomID });

    // Check if room exists
    if (!room) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: "Can't find requested room.",
        error: 404,
      };
      return;
    }

    // Check if user is member of room
    if (
      room.members === undefined ||
      !room.members.find((r) => r.uid === uid)
    ) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: "Can't delete messages in this room.",
        error: 403,
      };
      return;
    }

    // Check if user hasn't already left the room
    const profile = await profiles.findOne({ uid: uid });

    if (
      profile!.chats !== undefined &&
      !profile!.chats.find((c: any) => c.uid === roomID)
    ) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: "Can't delete messages in this room anymore.",
        error: 403,
      };
      return;
    }

    // Find the message being referenced
    const msg = room.messages.find((m: any) => m.messageID === messageID);

    // Check if message exists
    if (!msg) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: "Message being referenced doesn't exist.",
        error: 404,
      };
      return;
    }

    // Check if sender is current user
    if (msg.senderID !== uid) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: "Can't delete this message.",
        error: 403,
      };
      return;
    }

    // Delete the message being referenced
    await chats.updateOne(
      { room: roomID },
      {
        $set: {
          messages: room.messages.filter((m) => m.messageID !== messageID),
        },
      }
    );

    ctx.response.body = { message: 'Message deleted successfully!', error: 0 };
  }

  async leave(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, roomID } = await value;

    if (!uid || !roomID) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Find current user
    const current = await profiles.findOne({ uid: uid });

    // Check if user profile exist
    if (!current) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'User not found.',
        error: 404,
      };
      return;
    }

    // Find requested matching room
    const room = await chats.findOne({ room: roomID });

    // Check if room exists
    if (!room) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: "Can't find requested room.",
        error: 404,
      };
      return;
    }

    // Check if user is well present in the chat room
    if (
      current.chats === undefined ||
      !current.chats.find((c: any) => c.uid === roomID)
    ) {
      // ctx.response.status = 400;
      ctx.response.body = {
        message: 'User is already not a member of this room.',
        error: 400,
      };
      return;
    }

    // Remove user from room
    await chats.updateOne(
      { room: roomID },
      {
        $set: {
          members: room.members.filter((r) => r.uid !== uid),
        },
      }
    );

    // Update the chat for the current user
    await profiles.updateOne(
      { uid: uid },
      {
        $set: {
          chats: current.chats.filter((c) => c.uid !== roomID),
        },
      }
    );

    ctx.response.body = {
      message: `Left room ${roomID}.`,
      error: 0,
    };
  }
}

const messageController = new MessageController();
export default messageController;
