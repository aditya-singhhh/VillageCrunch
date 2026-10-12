const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const Product = require('../models/Product');
const { protect, admin } = require('../middleware/auth');

// ✅ Configure multer for image upload (files live under UPLOAD_DIR, see config/uploads.js)
const { dirs, imageFileFilter, safeExtension, managedImagePath } = require('../config/uploads');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, req.path.includes('/reviews/upload-images') ? dirs.reviews : dirs.products);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + require('crypto').randomBytes(6).toString('hex');
    const prefix = req.path.includes('/reviews/upload-images') ? 'review' : 'product';
    cb(null, prefix + '-' + uniqueSuffix + safeExtension(file));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// @route   POST /api/products/upload-image
// @desc    Upload product image
// @access  Private/Admin
router.post('/upload-image', protect, admin, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    // Return the relative URL path for the uploaded image
    const imageUrl = `/Product_Images/${req.file.filename}`;
    
    res.json({
      message: 'Image uploaded successfully',
      imageUrl: imageUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ message: 'Failed to upload image' });
  }
});

// @route   POST /api/products/upload-images
// @desc    Upload multiple product images
// @access  Private/Admin
router.post('/upload-images', protect, admin, upload.array('images', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No image files provided' });
    }

    // Return the relative URL paths for all uploaded images
    const imageUrls = req.files.map(file => `/Product_Images/${file.filename}`);
    
    res.json({
      message: `${req.files.length} images uploaded successfully`,
      imageUrls: imageUrls,
      filenames: req.files.map(file => file.filename)
    });
  } catch (error) {
    console.error('Multiple images upload error:', error);
    res.status(500).json({ message: 'Failed to upload images' });
  }
});

// @route   GET /api/products
// @desc    Get all products
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { category, featured, search, group, all } = req.query;
    let query = {};

    // Hidden products (isActive: false) stay out of the shop; the admin list asks for all=true.
    if (all !== 'true') {
      query.isActive = { $ne: false };
    }

    if (group) {
      query.packGroup = String(group);
    }

    if (category) {
      query.category = category;
    }

    if (featured === 'true') {
      query.featured = true;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const products = await Product.find(query).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/products/:id
// @desc    Get single product
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('reviews.user', 'name');
    
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/products
// @desc    Create a product
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/products/:id
// @desc    Update a product
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
  try {
    // Get the existing product to check for image changes
    const existingProduct = await Product.findById(req.params.id);
    
    if (!existingProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Helper function to delete old image file (only files we manage, never external URLs)
    const deleteOldImageFile = (imagePath) => {
      const filePath = managedImagePath(imagePath, 'Product_Images', dirs.products);
      if (filePath && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.error(`Error deleting old image file ${filePath}:`, err.message);
        }
      }
    };

    // Check if main image is being changed and delete old one
    if (req.body.image && existingProduct.image && req.body.image !== existingProduct.image) {
      deleteOldImageFile(existingProduct.image);
    }

    // Check if additional images are being changed and delete old ones
    if (req.body.images && existingProduct.images) {
      // Find images that are being removed
      const imagesToDelete = existingProduct.images.filter(oldImage => 
        !req.body.images.includes(oldImage)
      );
      
      // Delete the removed images
      imagesToDelete.forEach(imagePath => {
        deleteOldImageFile(imagePath);
      });
    }

    // Update the product
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/products/:id
// @desc    Delete a product
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Helper function to delete image file (only files we manage, never external URLs)
    const deleteImageFile = (imagePath) => {
      const filePath = managedImagePath(imagePath, 'Product_Images', dirs.products);
      if (filePath && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.error(`Error deleting image file ${filePath}:`, err.message);
        }
      }
    };

    // Delete the main product image
    if (product.image) {
      deleteImageFile(product.image);
    }

    // Delete additional images if they exist
    if (product.images && Array.isArray(product.images)) {
      product.images.forEach(imagePath => {
        deleteImageFile(imagePath);
      });
    }

    // Delete the product from database
    await Product.findByIdAndDelete(req.params.id);

    res.json({ message: 'Product and associated images removed successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/products/:id/reviews
// @desc    Create or update product review
// @access  Private
router.post('/:id/reviews', protect, async (req, res) => {
  try {
    const { rating, comment, images = [] } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if user has purchased this product and it's delivered
    const Order = require('../models/Order');
    const userOrders = await Order.find({ 
      user: req.user._id, 
      status: 'delivered',
      'items.product': req.params.id 
    });

    if (userOrders.length === 0) {
      return res.status(400).json({ 
        message: 'You can only review products you have purchased and received' 
      });
    }

    // Check if user already reviewed this product
    const existingReviewIndex = product.reviews.findIndex(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (existingReviewIndex !== -1) {
      // Update existing review
      product.reviews[existingReviewIndex].rating = Number(rating);
      if (comment) {
        product.reviews[existingReviewIndex].comment = comment;
      }
      if (images && images.length > 0) {
        product.reviews[existingReviewIndex].images = images;
      }
      product.reviews[existingReviewIndex].updatedAt = new Date();
    } else {
      // Create new review
      const review = {
        user: req.user._id,
        name: req.user.name,
        rating: Number(rating),
        comment: comment || '',
        images: images || [],
        verified: true,
        helpful: 0,
        helpfulUsers: []
      };
      product.reviews.push(review);
    }

    // Update product rating
    product.rating =
      product.reviews.reduce((acc, item) => item.rating + acc, 0) /
      product.reviews.length;

    await product.save();
    
    const message = existingReviewIndex !== -1 ? 'Review updated successfully' : 'Review added successfully';
    res.status(201).json({ message });
  } catch (error) {
    console.error('Error adding/updating review:', error);
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/products/reviews/upload-images
// @desc    Upload review images
// @access  Private
router.post('/reviews/upload-images', protect, upload.array('images', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No images uploaded' });
    }

    const imageUrls = req.files.map(file => `/Review_Images/${file.filename}`);
    
    res.status(200).json({ 
      message: 'Images uploaded successfully',
      images: imageUrls
    });
  } catch (error) {
    console.error('Error uploading review images:', error);
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/products/:id/reviews/:reviewId/helpful
// @desc    Mark review as helpful or unhelpful
// @access  Private
router.post('/:id/reviews/:reviewId/helpful', protect, async (req, res) => {
  try {
    const { helpful } = req.body; // true for helpful, false for unhelpful
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const review = product.reviews.id(req.params.reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if user already voted
    const userVoteIndex = review.helpfulUsers.indexOf(req.user._id);
    
    if (helpful && userVoteIndex === -1) {
      // Add helpful vote
      review.helpful += 1;
      review.helpfulUsers.push(req.user._id);
    } else if (!helpful && userVoteIndex !== -1) {
      // Remove helpful vote
      review.helpful -= 1;
      review.helpfulUsers.pull(req.user._id);
    }

    await product.save();
    
    res.status(200).json({ 
      message: helpful ? 'Marked as helpful' : 'Removed helpful vote',
      helpful: review.helpful
    });
  } catch (error) {
    console.error('Error updating review helpfulness:', error);
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/products/:id/reviews
// @desc    Get all reviews for a product with pagination
// @access  Public
router.get('/:id/reviews', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || 'newest'; // newest, oldest, helpful, rating

    const product = await Product.findById(req.params.id).populate('reviews.user', 'name');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    let sortedReviews = [...product.reviews];

    // Sort reviews based on sortBy parameter
    switch (sortBy) {
      case 'oldest':
        sortedReviews.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case 'helpful':
        sortedReviews.sort((a, b) => b.helpful - a.helpful);
        break;
      case 'rating':
        sortedReviews.sort((a, b) => b.rating - a.rating);
        break;
      default: // newest
        sortedReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedReviews = sortedReviews.slice(startIndex, endIndex);

    // Rating statistics
    const ratingStats = {
      average: product.rating,
      total: product.reviews.length,
      distribution: {
        5: product.reviews.filter(r => r.rating === 5).length,
        4: product.reviews.filter(r => r.rating === 4).length,
        3: product.reviews.filter(r => r.rating === 3).length,
        2: product.reviews.filter(r => r.rating === 2).length,
        1: product.reviews.filter(r => r.rating === 1).length,
      }
    };

    res.status(200).json({
      reviews: paginatedReviews,
      pagination: {
        current: page,
        pages: Math.ceil(product.reviews.length / limit),
        total: product.reviews.length
      },
      stats: ratingStats
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/products/cleanup/orphaned-images
// @desc    Clean up orphaned image files (images not referenced by any product)
// @access  Private/Admin
router.delete('/cleanup/orphaned-images', protect, admin, async (req, res) => {
  try {
    const imageDirPath = dirs.products;
    
    // Get all products and their image references
    const products = await Product.find({}, 'image images');
    const referencedImages = new Set();
    
    // Collect all referenced image filenames
    products.forEach(product => {
      if (product.image) {
        const filename = product.image.split('/').pop();
        referencedImages.add(filename);
      }
      if (product.images && Array.isArray(product.images)) {
        product.images.forEach(imagePath => {
          const filename = imagePath.split('/').pop();
          referencedImages.add(filename);
        });
      }
    });

    // Get all files in the images directory
    let deletedFiles = [];
    let totalFiles = 0;
    
    if (fs.existsSync(imageDirPath)) {
      const files = fs.readdirSync(imageDirPath);
      totalFiles = files.length;
      
      files.forEach(filename => {
        // Skip non-image files
        const ext = path.extname(filename).toLowerCase();
        if (!['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
          return;
        }
        
        // If image is not referenced by any product, delete it
        if (!referencedImages.has(filename)) {
          const filePath = path.join(imageDirPath, filename);
          try {
            fs.unlinkSync(filePath);
            deletedFiles.push(filename);
            console.log(`Deleted orphaned image: ${filename}`);
          } catch (err) {
            console.error(`Error deleting orphaned image ${filename}:`, err);
          }
        }
      });
    }

    res.json({
      message: 'Cleanup completed',
      totalImagesChecked: totalFiles,
      orphanedImagesDeleted: deletedFiles.length,
      deletedFiles: deletedFiles
    });
  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;