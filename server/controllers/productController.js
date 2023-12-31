import catchAsync from "../utils/catchAsync.js";
import Product from "./../models/productSchema.js";
import ApiError from "./../utils/ApiError.js";
import cloudinary from "cloudinary";
import fs from "fs";
import User from "./../models/userSchema.js";
import ApiFeatures from "../utils/ApiFeatures.js";

export const createProduct = catchAsync(async (req, res, next) => {
  if (!req.files || !req.files.images)
    return next(new ApiError(400, "no images to upload"));
  const images = Array.isArray(req.files["images"])
    ? req.files["images"]
    : [req.files["images"]];
  if (images.length === 0)
    return next(new ApiError(400, "no images to upload"));
  const validFormats = ["jpg", "jpeg", "png"];
  for (let image in images) {
    console.log(images[image]);
    if (images[image].size / 1024 ** 2 > 1.5)
      return next(
        new ApiError(
          400,
          `${images[image].name} should have size less than 1.5 mb.`
        )
      );
    const nameArr = images[image].name.split(".");
    if (!validFormats.includes(nameArr[nameArr.length - 1]))
      return next(
        new ApiError(
          400,
          `invalid format { ${images[image].name}}, only ${validFormats} are allowed`
        )
      );
  }
  const { name, description, price, category, countInStock, forWhom, brand } =
    req.body;
  const product = await Product.create({
    name,
    description,
    price,
    category,
    countInStock,
    forWhom,
    brand,
  });
  // console.log("api key------>", process.env.CLOUDINARY_API_KEY);
  const cloudinaryPromises = images.map((image) =>
    cloudinary.v2.uploader.upload(image.tempFilePath)
  );

  const cloudImg = await Promise.all(cloudinaryPromises);
  const imagesArr = [];
  cloudImg.forEach((img) => {
    imagesArr.push({ url: img.secure_url, public_id: img.public_id });
  });
  product.images = imagesArr;
  await product.save();

  res.status(200).json(product);
});

export const getAllProduct = catchAsync(async (req, res, next) => {
  // const products = await Product.find();
  const totalDoc = await Product.countDocuments();
  const features = new ApiFeatures(Product.find(), req.query)
    .filter()
    .sort()
    .pagination(totalDoc)
    .search();
  const products = await features.query;
  res.status(200).json({
    results: products.length,
    products,
  });
});

export const getProductById = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id).populate({
    path: "reviews",
    select: "title author rating product",
    populate: {
      path: "author",
      model: User,
      select: "name avatar",
    },
  });
  if (!product) return next(new ApiError(400, "no product found with this id"));
  res.status(200).json({ product });
});

export const updateProductDetails = catchAsync(async (req, res, next) => {
  const productId = req.params.id;
  let product = await Product.findById(productId);
  if (!product) return next(new ApiError(404, "product does not exist"));
  product.name = req.body.name || product.name;
  product.description = req.body.description || product.description;
  product.price = req.body.price || product.price;
  product.category = req.body.category || product.category;
  product.countInStock = req.body.countInStock || product.countInStock;
  product.brand = req.body.brand || product.brand;
  product = await product.save();
  res.status(200).json({ product });
});

export const addImagesToProduct = catchAsync(async (req, res, next) => {
  let product = await Product.findById(req.params.id);
  if (!product) return next(new ApiError(404, "product does not exists"));
  if (!req.files || !req.files.images)
    return next(new ApiError(400, "no images to upload"));
  const images = Array.isArray(req.files.images)
    ? req.files.images
    : [req.files.images];
  const validFormats = ["jpg", "jpeg", "png"];
  for (let image in images) {
    if (images[image].size / 1024 ** 2 > 1.5)
      return next(
        new ApiError(
          400,
          `${images[image].name} should have size less than 1.5 mb.`
        )
      );
    const nameArr = images[image].name.split(".");
    if (!validFormats.includes(nameArr[nameArr.length - 1]))
      return next(
        new ApiError(
          400,
          `invalid format { ${images[image].name}}, only ${validFormats} are allowed`
        )
      );
  }
  const cloudinaryPromises = images.map((image) =>
    cloudinary.v2.uploader.upload(image.tempFilePath)
  );

  const cloudImg = await Promise.all(cloudinaryPromises);
  const imagesArr = [];
  cloudImg.forEach((img) => {
    imagesArr.push({ url: img.secure_url, public_id: img.public_id });
  });
  product.images = imagesArr;

  product = await product.save();
  res.status(200).json(product);
});

export const deleteImageFromProduct = catchAsync(async (req, res, next) => {
  const productId = req.params.productId;
  let product = await Product.findById(productId);
  if (!product) return next(new ApiError(404, "product does not exist"));
  const imageId = req.params.imageId;
  const updatedImages = product.images.filter((image) => {
    return image.public_id !== imageId;
  });
  await cloudinary.v2.uploader.destroy(imageId);
  product.images = updatedImages;
  product = await product.save();
  res.status(200).json({
    product,
  });
});

export const deleteProduct = catchAsync(async (req, res, next) => {
  let product = await Product.findById(req.params.id);
  console.log(req.params.id);
  if (!product) return next(new ApiError(404, "product does not exists"));
  await Promise.all(
    product?.images?.map((img) => cloudinary.v2.uploader.destroy(img.public_id))
  );
  await Product.findByIdAndDelete(req.params.id);
  res.status(200).json({
    message: "product deleted",
  });
});

export const getStats = catchAsync(async (req, res, next) => {
  const type = req.params.type;

  const categories = await Product.aggregate([
    {
      $group: {
        _id: `$${type}`,
        count: { $sum: 1 },
        avgPrice: { $avg: "$price" },
        maxPrice: {
          $max: "$price",
        },
        minPrice: {
          $min: "$price",
        },
      },
    },
  ]);
  res.status(200).json({ categories });
});
