import { v4 } from '../deps.ts';

import { chat_profiles, chat_rooms } from '../components/mongo.ts';

class ChatRoomController {
  async fetchRooms(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid } = await value;

    if (!uid) {
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

    // Fetch all rooms
    let rooms = await chat_rooms.find();

    // Filter to include only rooms where the user is a member of
    rooms = rooms.filter((r: any) =>
      r.members.map((m: any) => m.uid).includes(uid)
    );

    // Filter deleted messages
    rooms = rooms.map((r: any) => {
      let updatedRoom = { ...r };
      updatedRoom.messages = updatedRoom.messages.filter((m: any) => {
        if (m!.is_deleted) {
          let updatedMessage = { ...m };
          updatedMessage.content = '';
          updatedMessage.threads = [];
          updatedMessage.reacts = [];
          updatedMessage.reply_to = '';
          return updatedMessage;
        } else {
          return { ...m };
        }
      });
      return updatedRoom;
    });

    ctx.response.body = {
      rooms: rooms,
      error: 0,
    };
  }

  async createRoom(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, description, created_on } = await value;

    if (!uid || !created_on) {
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

    // Created and save the new room
    const newRoom = {
      uid: uid,
      roomID: v4.generate(),
      description: description ? description : '',
      created_on: created_on,
      modified_on: created_on,
      preview_img: '',
      admins: [{ uid: uid }],
      members: [{ uid: uid }],
      messages: [],
    };

    await chat_rooms.insertOne({
      ...newRoom,
    });

    ctx.response.body = {
      message: `Room successfully created.`,
      room: newRoom,
      error: 0,
    };
  }

  async updateRoom(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, roomID, description, preview_img } = await value;

    if (!uid || !roomID || (!description && !preview_img)) {
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

    // Check if room with roomID supplied exists
    const room = await chat_rooms.findOne({ roomID: roomID });

    if (!room) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'No room with that roomID found.',
        error: 404,
      };
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

    // Created and save the new room
    await chat_rooms.updateOne(
      { roomID: roomID },
      {
        $set: {
          description:
            description !== undefined ? description : room!.description,
          modified_on: timestamp,
          preview_img:
            preview_img !== undefined ? preview_img : room!.preview_img,
        },
      }
    );

    ctx.response.body = {
      message: `Room successfully updated.`,
      error: 0,
    };
  }

  async addRoomMember(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, roomID, profileID, isAdmin } = await value;

    if (!uid || !roomID || !profileID || !isAdmin) {
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

    // Check if room with roomID supplied exists
    const room = await chat_rooms.findOne({ roomID: roomID });

    if (!room) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'No room with that roomID found.',
        error: 404,
      };
      return;
    }

    const admins = room!.admins.map((a: any) => a.uid);
    const members = room!.members.map((m: any) => m.uid);

    // Check if current user is an admin
    if (!admins.includes(uid)) {
      // ctx.response.status = 401;
      ctx.reponse.body = {
        message: 'User needs to be an admin first.',
        error: 401,
      };
      return;
    }

    // Check if targetUser is already a member or admin
    if (admins.includes(profileID) && isAdmin === 'true') {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: 'User is already an admin.',
        error: 403,
      };
      return;
    } else if (members.includes(profileID) && isAdmin === 'false') {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: 'User is already a member of this room.',
        error: 403,
      };
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

    // Prepare new system message for new member that has been added
    const newMessage = {
      uid: '_system',
      messageID: v4.generate(),
      created_on: timestamp,
      modified_on: timestamp,
      content: `${targetUser.username} has been added to this room.`,
      is_deleted: false,
      threads: [],
      reacts: [],
      reply_to: '',
    };

    // Update and save the room
    await chat_rooms.updateOne(
      { roomID: roomID },
      {
        $set: {
          members: members.includes(profileID)
            ? members
            : [...members, { uid: profileID }],
          admins: isAdmin === 'true' ? [...admins, { uid: profileID }] : admins,
          messages: !members.includes(profileID)
            ? room!.messages.length > 0
              ? [...room!.messages, { ...newMessage }]
              : [{ ...newMessage }]
            : [...room!.messages],
        },
      }
    );

    ctx.response.body = {
      message: `Room successfully updated.`,
      error: 0,
    };
  }

  async removeRoomMember(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, roomID, profileID } = await value;

    if (!uid || !roomID || !profileID) {
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

    // Check if room with roomID supplied exists
    const room = await chat_rooms.findOne({ roomID: roomID });

    if (!room) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'No room with that roomID found.',
        error: 404,
      };
      return;
    }

    const admins = room!.admins.map((a: any) => a.uid);
    const members = room!.members.map((m: any) => m.uid);

    // Check if target user is a member of the room
    if (!members.includes(profileID)) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: 'User is already not a member of this room.',
        error: 403,
      };
      return;
    }

    // Check if current user is an admin
    if (!admins.includes(uid) && uid !== profileID) {
      // ctx.response.status = 401;
      ctx.reponse.body = {
        message: 'User needs to be an admin first.',
        error: 401,
      };
      return;
    }

    // Check if targetUser is already a member or admin
    if (admins.includes(profileID) && uid !== profileID) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: 'Cannot remove an admin.',
        error: 403,
      };
      return;
    } else if (members.includes(profileID) && !admins.includes(uid)) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: 'Need to be an admin first to remove another member.',
        error: 403,
      };
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

    // Prepare new system message for new member that has been removed
    const newMessage = {
      uid: '_system',
      messageID: v4.generate(),
      created_on: timestamp,
      modified_on: timestamp,
      content: `${targetUser.username} has left this room.`,
      is_deleted: false,
      threads: [],
      reacts: [],
      reply_to: '',
    };

    // Update and save the room
    await chat_rooms.updateOne(
      { roomID: roomID },
      {
        $set: {
          members: members.filter((m: any) => m!.uid !== profileID),
          admins: admins.filter((a: any) => a!.uid !== profileID),
          messages:
            room!.messages.length > 0
              ? [...room!.messages, { ...newMessage }]
              : [{ ...newMessage }],
        },
      }
    );

    ctx.response.body = {
      message: `Member successfully removed from room.`,
      error: 0,
    };
  }

  async sendMessage(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, roomID, messageID, content, reply_to, isThread } = await value;

    if (!uid || !roomID || !messageID || !content || !isThread) {
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

    // Check if room with roomID supplied exists
    const room = await chat_rooms.findOne({ roomID: roomID });

    if (!room) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'No room with that roomID found.',
        error: 404,
      };
      return;
    }

    const members = room!.members.map((m: any) => m.uid);
    const messages = room!.messages.map((m: any) => m.messageID);

    // Check if user is a member of room
    if (!members.includes(uid)) {
      // ctx.response.status = 403;
      ctx.reponse.body = {
        message: "Can't send a message in this room.",
        error: 403,
      };
      return;
    }

    // Check if message exists if a thread is being created
    if (!messages.includes(messageID) && isThread === 'true') {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: "Message being referenced doesn't exist.",
        error: 404,
      };
      return;
    }

    const currentMsg = room.messages!.find(
      (m: any) => m!.messageID === messageID
    );

    const threads =
      isThread === 'true'
        ? currentMsg!.threads.map((t: any) => t.threadID)
        : [];

    // Check if reply_to exists if passed
    if (reply_to && reply_to.length > 0) {
      if (
        (isThread === 'true' &&
          (threads.length <= 0 || !threads.includes(reply_to))) ||
        (isThread === 'false' && !messages.includes(reply_to))
      ) {
        // ctx.response.status = 404;
        ctx.response.body = {
          message: `${
            isThread === 'true' ? 'Thread' : 'Message'
          } being replied to doesn't exist.`,
          error: 404,
        };
        return;
      }
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

    // Prepare new message / thread to be saved
    const newMessage = {
      uid: uid,
      messageID: v4.generate(),
      created_on: timestamp,
      modified_on: timestamp,
      content: content,
      is_deleted: false,
      threads: [],
      reacts: [],
      reply_to: reply_to ? reply_to : '',
    };

    const newThread = {
      uid: uid,
      threadID: v4.generate(),
      created_on: timestamp,
      modified_on: timestamp,
      content: content,
      is_deleted: false,
      reacts: [],
      reply_to: reply_to ? reply_to : '',
    };

    // Update and save the room
    await chat_rooms.updateOne(
      { roomID: roomID },
      {
        $set: {
          messages:
            isThread !== 'true'
              ? room!.messages.length > 0
                ? [...room!.messages, { ...newMessage }]
                : [{ ...newMessage }]
              : room!.messages.map((m: any) => {
                  if (m!.messageID === messageID) {
                    let updatedMessage = { ...m };
                    updatedMessage.threads =
                      updatedMessage.threads.length > 0
                        ? [...updatedMessage.threads, { ...newThread }]
                        : [{ ...newThread }];
                    return updatedMessage;
                  } else {
                    return { ...m };
                  }
                }),
        },
      }
    );

    ctx.response.body = {
      message: `${
        isThread === 'true' ? 'Thread' : 'Message'
      } successfully created.`,
      chat: isThread !== 'true' ? newMessage : newThread,
      error: 0,
    };
  }

  async editMessage(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, roomID, messageID, threadID, content, isThread } = await value;

    if (
      !uid ||
      !roomID ||
      !messageID ||
      !content ||
      !isThread ||
      (!threadID && isThread === 'true')
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

    // Check if room with roomID supplied exists
    const room = await chat_rooms.findOne({ roomID: roomID });

    if (!room) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'No room with that roomID found.',
        error: 404,
      };
      return;
    }

    const members = room!.members.map((m: any) => m.uid);
    const messages = room!.messages.map((m: any) => m.messageID);

    // Check if user is a member of room
    if (!members.includes(uid)) {
      // ctx.response.status = 403;
      ctx.reponse.body = {
        message: "Can't edit a message in this room.",
        error: 403,
      };
      return;
    }

    // Check if message being referenced exists
    if (!messages.includes(messageID)) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: "Message being referenced doesn't exist.",
        error: 404,
      };
      return;
    }

    const currentMsg = room.messages!.find(
      (m: any) => m!.messageID === messageID
    );

    const threads =
      isThread === 'true'
        ? currentMsg!.threads.map((t: any) => t.threadID)
        : [];

    // Check if thread with threadID exists
    if (
      isThread === 'true' &&
      (threads.length <= 0 || !threads.includes(threadID))
    ) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: "Thread with threadID being referenced doesn't exist.",
        error: 404,
      };
      return;
    }

    const currentThread =
      isThread === 'true'
        ? currentMsg!.threads.find((t: any) => t.threadID === threadID)
        : {
            uid: '',
            threadID: '',
            content: '',
            created_on: new Date(),
            modified_on: new Date(),
            is_deleted: false,
            reacts: [],
            reply_to: '',
          };

    // Check if owner of message or thread, or if message/thread is deleted
    if (
      (isThread !== 'true' &&
        (currentMsg!.is_deleted || currentMsg!.uid !== uid)) ||
      (isThread === 'true' &&
        (currentThread!.is_deleted || currentThread!.uid !== uid))
    ) {
      // ctx.response.status = 401;
      ctx.response.body = {
        message: `Can't edit this ${
          isThread === 'true' ? 'thread' : 'message'
        }.`,
        error: 401,
      };
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

    // Prepare the edited message / thread to be saved
    let editedItem =
      isThread === 'true' ? { ...currentThread } : { ...currentMsg };
    editedItem!.modified_on = timestamp;
    editedItem!.content = content;

    // Update and save the room
    await chat_rooms.updateOne(
      { roomID: roomID },
      {
        $set: {
          messages:
            isThread !== 'true'
              ? room!.messages.map((m: any) => {
                  if (m!.messageID === messageID) {
                    return { ...editedItem };
                  } else {
                    return { ...m };
                  }
                })
              : room!.messages.map((m: any) => {
                  if (m!.messageID === messageID) {
                    let updatedMessage = { ...m };
                    updatedMessage.threads = updatedMessage.threads.map(
                      (t: any) => {
                        if (t!.threadID === threadID) {
                          return { ...editedItem };
                        } else {
                          return { ...t };
                        }
                      }
                    );
                    return updatedMessage;
                  } else {
                    return { ...m };
                  }
                }),
        },
      }
    );

    ctx.response.body = {
      message: `${
        isThread === 'true' ? 'Thread' : 'Message'
      } successfully edited.`,
      error: 0,
    };
  }

  async reactMessage(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const {
      uid,
      roomID,
      messageID,
      threadID,
      isThread,
      reactID,
      react,
      addReact,
    } = await value;

    if (
      !uid ||
      !roomID ||
      !messageID ||
      !react ||
      !addReact ||
      !isThread ||
      (!threadID && isThread === 'true') ||
      (!reactID && addReact !== 'true')
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

    // Check if room with roomID supplied exists
    const room = await chat_rooms.findOne({ roomID: roomID });

    if (!room) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'No room with that roomID found.',
        error: 404,
      };
      return;
    }

    const members = room!.members.map((m: any) => m.uid);
    const messages = room!.messages.map((m: any) => m.messageID);

    // Check if user is a member of room
    if (!members.includes(uid)) {
      // ctx.response.status = 403;
      ctx.reponse.body = {
        message: "Can't react to a message in this room.",
        error: 403,
      };
      return;
    }

    // Check if message being referenced exists
    if (!messages.includes(messageID)) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: "Message being referenced doesn't exist.",
        error: 404,
      };
      return;
    }

    const currentMsg = room.messages!.find(
      (m: any) => m!.messageID === messageID
    );

    const threads =
      isThread === 'true'
        ? currentMsg!.threads.map((t: any) => t.threadID)
        : [];

    // Check if thread with threadID exists
    if (
      isThread === 'true' &&
      (threads.length <= 0 || !threads.includes(threadID))
    ) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: "Thread with threadID being referenced doesn't exist.",
        error: 404,
      };
      return;
    }

    const currentThread =
      isThread === 'true'
        ? currentMsg!.threads.find((t: any) => t.threadID === threadID)
        : {
            threadID: '',
            created_on: new Date(),
            is_deleted: false,
            reacts: [],
            reply_to: '',
          };

    // Check if message/thread is deleted
    if (
      (isThread !== 'true' && currentMsg!.is_deleted) ||
      (isThread === 'true' && currentThread!.is_deleted)
    ) {
      // ctx.response.status = 401;
      ctx.response.body = {
        message: `Can't react to this ${
          isThread === 'true' ? 'thread' : 'message'
        }.`,
        error: 401,
      };
      return;
    }

    // Prepare the edited message / thread to be saved
    let editedItem =
      isThread === 'true' ? { ...currentThread } : { ...currentMsg };

    const reacts = [...editedItem!.reacts!];

    // Check if react exists
    if (
      reacts!.map((r: any) => r!.reactID).includes(reactID) &&
      addReact !== 'true'
    ) {
      const currentReact = editedItem!.reacts.find(
        (r: any) => r!.reactID === reactID
      );

      // Check if owner of react if wants to remove
      if (currentReact!.uid !== uid) {
        // ctx.response.status = 403;
        ctx.response.body = {
          message: "Can't remove this react.",
          error: 403,
        };
        return;
      } else {
        // Remove the react
        editedItem.reacts = editedItem!.reacts.filter(
          (r: any) => r!.reactID !== reactID
        );
      }
    } else if (addReact === 'true') {
      // Create an object for the new react
      const newReact = { uid: uid, reactID: v4.generate(), react: react };

      editedItem.reacts =
        editedItem!.reacts.length > 0
          ? [...editedItem!.reacts, { ...newReact }]
          : [{ ...newReact }];
    }

    // Update and save the room
    await chat_rooms.updateOne(
      { roomID: roomID },
      {
        $set: {
          messages:
            isThread !== 'true'
              ? room!.messages.map((m: any) => {
                  if (m!.messageID === messageID) {
                    return { ...editedItem };
                  } else {
                    return { ...m };
                  }
                })
              : room!.messages.map((m: any) => {
                  if (m!.messageID === messageID) {
                    let updatedMessage = { ...m };
                    updatedMessage.threads = updatedMessage.threads.map(
                      (t: any) => {
                        if (t!.threadID === threadID) {
                          return { ...editedItem };
                        } else {
                          return { ...t };
                        }
                      }
                    );
                    return updatedMessage;
                  } else {
                    return { ...m };
                  }
                }),
        },
      }
    );

    ctx.response.body = {
      message: `${
        isThread === 'true' ? 'Thread' : 'Message'
      } successfully reacted to.`,
      reacts: editedItem.reacts,
      error: 0,
    };
  }

  async deleteMessage(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, roomID, messageID, threadID, isThread } = await value;

    if (
      !uid ||
      !roomID ||
      !messageID ||
      !isThread ||
      (!threadID && isThread === 'true')
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

    // Check if room with roomID supplied exists
    const room = await chat_rooms.findOne({ roomID: roomID });

    if (!room) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'No room with that roomID found.',
        error: 404,
      };
      return;
    }

    const members = room!.members.map((m: any) => m.uid);
    const messages = room!.messages.map((m: any) => m.messageID);

    // Check if user is a member of room
    if (!members.includes(uid)) {
      // ctx.response.status = 403;
      ctx.reponse.body = {
        message: "Can't delete a message in this room.",
        error: 403,
      };
      return;
    }

    // Check if message being referenced exists
    if (!messages.includes(messageID)) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: "Message being referenced doesn't exist.",
        error: 404,
      };
      return;
    }

    const currentMsg = room.messages!.find(
      (m: any) => m!.messageID === messageID
    );

    const threads =
      isThread === 'true'
        ? currentMsg!.threads.map((t: any) => t.threadID)
        : [];

    // Check if thread with threadID exists
    if (
      isThread === 'true' &&
      (threads.length <= 0 || !threads.includes(threadID))
    ) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: "Thread with threadID being referenced doesn't exist.",
        error: 404,
      };
      return;
    }

    const currentThread =
      isThread === 'true'
        ? currentMsg!.threads.find((t: any) => t.threadID === threadID)
        : {
            uid: '',
            threadID: '',
            created_on: new Date(),
            modified_on: new Date(),
            is_deleted: false,
            reacts: [],
            reply_to: '',
          };

    /// Check if owner of message or thread, or if message/thread is deleted
    if (
      (isThread !== 'true' &&
        (currentMsg!.is_deleted || currentMsg!.uid !== uid)) ||
      (isThread === 'true' &&
        (currentThread!.is_deleted || currentThread!.uid !== uid))
    ) {
      // ctx.response.status = 401;
      ctx.response.body = {
        message: `Can't delete this ${
          isThread === 'true' ? 'thread' : 'message'
        }.`,
        error: 401,
      };
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

    // Prepare the deleted message / thread to be saved
    let deletedItem =
      isThread === 'true' ? { ...currentThread } : { ...currentMsg };
    deletedItem!.modified_on = timestamp;
    deletedItem!.is_deleted = true;

    // Update and save the room
    await chat_rooms.updateOne(
      { roomID: roomID },
      {
        $set: {
          messages:
            isThread !== 'true'
              ? room!.messages.map((m: any) => {
                  if (m!.messageID === messageID) {
                    return { ...deletedItem };
                  } else {
                    return { ...m };
                  }
                })
              : room!.messages.map((m: any) => {
                  if (m!.messageID === messageID) {
                    let updatedMessage = { ...m };
                    updatedMessage.threads = updatedMessage.threads.map(
                      (t: any) => {
                        if (t!.threadID === threadID) {
                          return { ...deletedItem };
                        } else {
                          return { ...t };
                        }
                      }
                    );
                    return updatedMessage;
                  } else {
                    return { ...m };
                  }
                }),
        },
      }
    );

    ctx.response.body = {
      message: `${
        isThread === 'true' ? 'Thread' : 'Message'
      } successfully deleted.`,
      error: 0,
    };
  }
}

const chatRoomController = new ChatRoomController();
export default chatRoomController;
