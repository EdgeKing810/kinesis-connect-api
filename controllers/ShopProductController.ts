import { shop_products, shop_users } from '../components/mongo.ts';

class ShopProductController {
  async fetchAll(ctx: any) {
    if (!ctx.request.hasBody) return;

    // Find all shop products
    const shopProducts: any = await shop_products.find({});

    ctx.response.body = { products: shopProducts, error: 0 };
  }

  async create(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const {
      uid,
      productID,
      name,
      brand,
      category,
      description,
      images,
      amount,
      price,
    } = await value;

    if (
      !uid ||
      !productID ||
      !name ||
      !brand ||
      !category ||
      !description ||
      !price
    ) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Check if valid types and length for number inputs
    if (
      !/^\d+$/.test(amount.toString()) ||
      !/^\d+(,\d{3})*(\.\d{0,2})?$/.test(price.toString())
    ) {
      // ctx.response.status = 400;
      ctx.response.body = {
        message: 'Invalid format for some data supplied.',
        error: 400,
      };
      return;
    }

    // Ensure no product with supplied productID exists
    const existing = await shop_products.findOne({ productID: productID });

    if (existing) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message:
          'Supplied Product ID already corresponds to an existing product.',
        error: 403,
      };
      return;
    }

    // Create an object based on the characteristics of the new product
    const newProduct = {
      uid: uid,
      productID: productID,
      name: name,
      brand: brand,
      category: category,
      description: description,
      images: images ? images : [],
      rewiews: [],
      amount: amount ? amount : 0,
      price: price,
      shipping_cost: parseFloat(price) * 0.05,
    };

    // Save the new product in the db
    await shop_products.insertOne(newProduct);

    ctx.response.body = { message: 'Product successfully created!', error: 0 };
  }

  async edit(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const {
      uid,
      productID,
      name,
      brand,
      description,
      images,
      amount,
      price,
    } = await value;

    if (
      !uid ||
      !productID ||
      (!name && !brand && !description && !images && !amount && !price)
    ) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Check if valid types and length for number inputs
    if (
      (amount && !/^\d+$/.test(amount.toString())) ||
      (price && !/^\d+(,\d{3})*(\.\d{0,2})?$/.test(price.toString()))
    ) {
      // ctx.response.status = 400;
      ctx.response.body = {
        message: 'Invalid format for some data supplied.',
        error: 400,
      };
      return;
    }

    // Find the product being referenced
    const product = await shop_products.findOne({ productID: productID });

    // Check if product exists
    if (!product) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: "Product being referenced doesn't exist.",
        error: 404,
      };
      return;
    }

    // Find the user by uid
    const user = await shop_users.findOne({ uid: uid });

    // Check if owner of product or admin
    if ((product.uid !== uid || !user) && !user!.is_admin) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: 'Not allowed to edit this product.',
        error: 403,
      };
      return;
    }

    // Prepare the updated product object
    const updatedProduct = {
      uid: product!.uid,
      productID: product!.productID,
      name: name !== undefined ? name : product!.name,
      brand: brand !== undefined ? brand : product!.brand,
      description:
        description !== undefined ? description : product!.description,
      images: images !== undefined ? images : product!.images,
      rewiews: product!.reviews,
      amount: amount !== undefined ? amount : product!.amount,
      price: price !== undefined ? price : product!.price,
      shipping_cost:
        price !== undefined
          ? parseFloat(price) * 0.05
          : parseFloat(product!.price.toString()) * 0.05,
    };

    // Save the updated product
    await shop_products.updateOne(
      { productID: productID },
      { $set: updatedProduct }
    );

    ctx.response.body = { message: 'Product successfully updated!', error: 0 };
  }

  async createReview(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, productID, reviewID, review, rating, date } = await value;

    if (!uid || !productID || !reviewID || !review || !rating || !date) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Check if rating valid
    if (
      !parseFloat(rating) ||
      parseFloat(rating) < 0 ||
      parseFloat(rating) > 5
    ) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: 'Rating has to be a value between 0 - 5',
        error: 403,
      };
      return;
    }

    // Find the product being referenced
    const product = await shop_products.findOne({ productID: productID });

    // Check if product exists
    if (!product) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: "Product being referenced doesn't exist.",
        error: 404,
      };
      return;
    }

    // Check if review with reviewID exists
    if (
      product!.reviews &&
      product!.reviews !== undefined &&
      product!.reviews.length > 0 &&
      product!.reviews.find((r: any) => r!.reviewID === reviewID)
    ) {
      // ctx.response.status = 403;
      ctx.response.body = {
        message: 'Review with reviewID already exists.',
        error: 403,
      };
      return;
    }

    // Prepare the review object
    const newReview = {
      uid: uid,
      reviewID: reviewID,
      review: review,
      rating: rating,
      date: date,
    };

    // Save the updated product
    await shop_products.updateOne(
      { productID: productID },
      {
        $set: {
          reviews:
            product!.reviews &&
            product!.reviews !== undefined &&
            product!.reviews.length > 0
              ? [...product.reviews, newReview]
              : [{ ...newReview }],
        },
      }
    );

    ctx.response.body = { message: 'Review successfully created!', error: 0 };
  }

  async editReview(ctx: any) {
    if (!ctx.request.hasBody) return;

    const { value } = ctx.request.body({ type: 'json' });
    const { uid, productID, reviewID, review, date } = await value;

    if (!uid || !productID || !reviewID || !review || !date) {
      // ctx.response.status = 400;
      ctx.response.body = { message: 'Invalid data supplied.', error: 400 };
      return;
    }

    // Find the product being referenced
    const product = await shop_products.findOne({ productID: productID });

    // Check if product exists
    if (!product) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: "Product being referenced doesn't exist.",
        error: 404,
      };
      return;
    }

    // Find review being referenced
    const currentReview: any =
      !product!.reviews ||
      !product!.reviews === undefined ||
      product!.reviews.length === 0
        ? {}
        : product!.reviews.find((r: any) => r!.reviewID === reviewID);

    // Check if review with reviewID exists
    if (
      !currentReview ||
      !currentReview!.rating ||
      currentReview!.rating === undefined
    ) {
      // ctx.response.status = 404;
      ctx.response.body = {
        message: "Review with reviewID doesn't exist.",
        error: 404,
      };
      return;
    }

    // Prepare the updated review object
    const updatedReview = {
      uid: currentReview!.uid,
      reviewID: currentReview!.reviewID,
      review: review,
      rating: currentReview!.rating,
      date: date,
    };

    // Save the updated product
    await shop_products.updateOne(
      { productID: productID },
      {
        $set: {
          reviews: product!.reviews.map((r: any) => {
            if (r!.reviewID === reviewID) {
              return { ...updatedReview };
            } else {
              return { ...r };
            }
          }),
        },
      }
    );

    ctx.response.body = { message: 'Review successfully updated!', error: 0 };
  }
}

const shopProductController = new ShopProductController();
export default shopProductController;
