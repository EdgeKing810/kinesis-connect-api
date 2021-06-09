import { config, compareSync, verify } from '../deps.ts';
import { users } from '../components/mongo.ts';

const authMiddleware = async (ctx: any, next: Function) => {
  const headers = ctx.request.headers;
  if (!ctx.request.hasBody) return;

  const { value } = ctx.request.body({ type: 'json' });
  const { uid, old_password } = await value;

  if (!uid) {
    ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
    return;
  }

  // Get Authorization Bearer Token
  const authHeader = headers.get('Authorization');
  if (!authHeader) {
    ctx.response.body = {
      message: 'Missing Authorization Bearer Token.',
      error: 401,
    };
    return;
  }

  // Get JWT from Authorization Bearer Token
  const jwt = authHeader.split(' ')[1];
  if (!jwt) {
    ctx.response.body = {
      message: 'Missing JWT from Authorization Bearer Token.',
      error: 401,
    };
    return;
  }

  const key = config().SECRET_KEY;

  // Validate JWT
  const data: any = await verify(jwt, key, 'HS512');

  if (data && data.iss) {
    // Check if the uid supplied corresponds to the user account found from the email of the jwt
    const user = await users.findOne({ uid: uid });

    if (!user || user.email !== JSON.parse(data.iss).email) {
      ctx.response.body = { message: 'Incorrect UID.', error: 401 };
      return;
    }

    // Check if current password correct
    if (old_password && old_password !== undefined) {
      if (!compareSync(old_password, user.password)) {
        // ctx.response.status = 401;
        ctx.response.body = {
          message: 'Current Password Invalid.',
          error: 401,
        };
        return;
      }
    }

    if (user.active !== 'true') {
      ctx.response.body = { message: 'Account not yet activated.', error: 401 };
      return;
    }

    await next();
  } else {
    ctx.response.body = {
      message: 'Invalid Authorization Bearer Token or JWT.',
      error: 401,
    };
  }
};

export default authMiddleware;
