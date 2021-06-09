import { links } from '../components/mongo.ts';

class LinkController {
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
    const u = await links.findOne({ uid: uid });

    if (!u) {
      // Create new record and return empty array
      await links.insertOne({ uid: uid, links: [] });

      ctx.response.body = {
        links: [],
        error: 0,
      };
    } else {
      ctx.response.body = {
        links: u.links,
        error: 0,
      };
    }
  }

  async create(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, linkID, link } = await value;

    if (!uid || !linkID || !link) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    const data = {
      linkID,
      link,
    };

    // Find user whose uid corresponds to uid
    const u = await links.findOne({ uid: uid });

    if (!u) {
      // Create new record and return empty array
      await links.insertOne({ uid: uid, links: [{ ...data }] });

      ctx.response.body = {
        message: 'Successfully added link!',
        error: 0,
      };
    } else {
      if (u.links.find((n) => n.linkID === linkID)) {
        ctx.response.body = {
          message: 'Link with that linkID already exists.',
          error: 403,
        };
        return;
      }

      await links.updateOne(
        { uid: uid },
        {
          $set: {
            links: [...u.links, { ...data }],
          },
        }
      );

      ctx.response.body = {
        message: 'Successfully created link!',
        error: 0,
      };
    }
  }
}

const linkController = new LinkController();
export default linkController;
