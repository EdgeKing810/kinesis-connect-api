import { WebSocket, v4 } from '../deps.ts';

import { users, profiles } from '../components/mongo.ts';

let sockets: any = [];

const cleanSockets = () => {
  //sockets = sockets.filter((s: any) => s[1].state !== 1);
};

const getNotBlocked = async (uid: string) => {
  const profile: any = await profiles.findOne({ uid: uid });
  const blocked = profile!.blocked.map((p: any) => p.uid);
  const allUsers: any = await users.find({});
  const notBlocked = allUsers
    .filter((u: any) => !blocked.includes(u.uid))
    .map((uu: any) => uu.uid);

  return [...notBlocked, uid];
};

const getNotBlockedAndFollow = async (uid: string) => {
  const profile: any = await profiles.findOne({ uid: uid });
  const blocked = profile!.blocked.map((p: any) => p.uid);
  const allUsers: any = await users.find({});
  const notBlocked = allUsers
    .filter((u: any) => !blocked.includes(u.uid))
    .map((uu: any) => uu.uid);

  const followers = profile!.followers.map((p: any) => p.uid);

  return [...notBlocked, ...followers, uid];
};

const broadcastEvent = async (obj: any) => {
  for (let res of sockets) {
    if (res[0].roomID === obj.roomID) {
      if (res[1].state === 1) {
        res[1].send(
          JSON.stringify({
            ...obj,
          })
        );
      }
    }
  }
};

const broadcastEventGlobal = async (obj: any, uids: any) => {
  for (let res of sockets) {
    if (uids.includes(res[0].profileID)) {
      if (res[1].state === 1) {
        res[1].send(
          JSON.stringify({
            ...obj,
          })
        );
      }
    }
  }
};

const handleConnectRequest = async (ws: WebSocket, evObj: any) => {
  const uid = v4.generate();

  cleanSockets();
  console.log(evObj);
  //   console.log(sockets);

  if (evObj.type === 'join') {
    sockets.push([{ uid, roomID: evObj.roomID, profileID: evObj.uid }, ws]);
  }

  if (
    ['getID', 'room_leave', 'account_delete'].includes(evObj.type.toString())
  ) {
    broadcastEvent(evObj);
  } else if (['profile_change'].includes(evObj.type.toString())) {
    broadcastEventGlobal(evObj, await getNotBlocked(evObj.uid));
  } else if (
    [
      'post_new',
      'post_edit',
      'post_delete',
      'post_react',
      'comment_new',
      'comment_edit',
      'comment_delete',
      'comment_react',
    ].includes(evObj.type.toString())
  ) {
    broadcastEventGlobal(evObj, await getNotBlockedAndFollow(evObj.uid));
  } else if (
    [
      'room_join',
      'message_new',
      'message_edit',
      'message_delete',
      'relation',
    ].includes(evObj.type.toString())
  ) {
    broadcastEventGlobal(evObj, [evObj.uid, evObj.profileID]);
  } else if (['notification'].includes(evObj.type.toString())) {
    broadcastEventGlobal(evObj, [evObj.uid]);
  }
};

export { handleConnectRequest };
