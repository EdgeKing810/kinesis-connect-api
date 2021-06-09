import { shop_orders, shop_products, shop_users } from '../components/mongo.ts';

class ShopProductController {
  async fetch(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid } = await value;

    if (!uid) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Find all shop orders
    let shopOrders: any = await shop_orders.find({});

    // Find the user by uid
    const user = await shop_users.findOne({ uid: uid });

    // Check if user found
    if (!user) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: 'User being referenced not found.',
        error: 404,
      };
      return;
    }

    // Include only proper orders
    shopOrders = shopOrders.filter(
      (o: any) => o!.uid === uid || user!.is_admin
    );

    ctx.response.body = { orders: shopOrders, error: 0 };
  }

  async create(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, orderID, date, products } = await value;

    if (!uid || !orderID || !date || !products) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Find the order being referenced
    const order = await shop_orders.findOne({ orderID: orderID });

    // Check if order exists
    if (order) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: "Order being referenced already exists.",
        error: 403,
      };
      return;
    }

    // Make sure every product has a good structure
    const checkValid =
      products !== undefined &&
      products.length > 0 &&
      products.every(
        (p: any) =>
          p!.uid &&
          p!.uid !== undefined &&
          p!.productID &&
          p!.productID !== undefined &&
          p!.amount !== undefined &&
          p!.amount > 0
      );

    if (!checkValid) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: 'Some or all of the products requested lack additional data.',
        error: 403,
      };
      return;
    }

    // Make sure all products exist
    const shopProducts: any = await shop_products.find({});
    const checkExist = products.every((p: any) =>
      shopProducts.find((pro: any) => pro.productID === p.productID)
        ? true
        : false
    );

    if (!checkExist) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: "Some or all of the products requested haven't been found.",
        error: 404,
      };
      return;
    }

    // Make sure all products have quantity availables
    const checkEnough = products.every((p: any) =>
      shopProducts.find((pro: any) => pro.productID === p.productID)!.amount >=
      p.amount
        ? true
        : false
    );

    if (!checkEnough) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message:
          'Some or all of the products requested have less than the requested amount in stock.',
        error: 403,
      };
      return;
    }

    // Create an object based on the characteristics of the new order
    const newOrder = {
      uid: uid,
      orderID: orderID,
      date: date,
      is_paid: { status: false, date: new Date() },
      is_delivered: { status: false, date: new Date() },
      tax_percentage: 1.15,
      products: products,
    };

    // Save the new order in the db
    await shop_orders.insertOne(newOrder);

    // Update the new amount of every product in order
    products.forEach(async (pro: any) => {
      const product: any = shopProducts.find(
        (p: any) => p.productID === pro!.productID
      );

      if (
        !product ||
        product === undefined ||
        !product!.amount ||
        !product!.amount === undefined
      ) {
        return;
      }

      await shop_products.updateOne(
        { productID: pro!.productID },
        {
          $set: {
            amount: product!.amount - pro.amount,
          },
        }
      );
    });

    ctx.response.body = {
      order: newOrder,
      message: 'Order successfully created!',
      error: 0,
    };
  }

  async update(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, orderID, isPaid, isDelivered } = await value;

    if (!uid || !orderID || (!isPaid && !isDelivered)) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Find the order being referenced
    const order = await shop_orders.findOne({ orderID: orderID });

    // Check if order exists
    if (!order) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: "Order being referenced doesn't exist.",
        error: 404,
      };
      return;
    }

    // Check if user is admin to be able to mark order as delivered
    const user: any = await shop_users.findOne({ uid: uid });
    if (isDelivered && isDelivered !== undefined && !user!.is_admin) {
      // ctx.response.status = 401;
      ctx.response.body = {
        message:
          'You need to be an admin to mark an order as being delivered or not.',
        error: 401,
      };
      return;
    }

    // Create an object based on the characteristics of the updated order
    const updatedOrder = {
      uid: order!.uid,
      orderID: order!.orderID,
      date: order!.date,
      is_paid:
        isPaid && isPaid !== undefined
          ? { status: isPaid === 'true', date: new Date() }
          : order!.is_paid,
      is_delivered:
        isDelivered && isDelivered !== undefined
          ? { status: isDelivered === 'true', date: new Date() }
          : order!.is_delivered,
      tax_percentage: order!.tax_percentage,
      products: order!.products,
    };

    // Save the updated order in the db
    await shop_orders.updateOne({ orderID: orderID }, { $set: updatedOrder });

    ctx.response.body = {
      order: updatedOrder,
      message: 'Order successfully updated!',
      error: 0,
    };
  }
}

const shopProductController = new ShopProductController();
export default shopProductController;
