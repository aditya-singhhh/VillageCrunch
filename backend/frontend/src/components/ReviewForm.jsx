import { useState, useRef } from 'react';
import { Star, Upload, X, Camera, ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

const ReviewForm = ({ 
  product, 
  existingReview = null, 
  onSubmit, 
  onCancel, 
  isSubmitting = false 
}) => {
  const [rating, setRating] = useState(existingReview?.rating || 5);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [images, setImages] = useState(existingReview?.images || []);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [hoveredRating, setHoveredRating] = useState(0);
  const fileInputRef = useRef(null);

  const handleImageUpload = async (files) => {
    if (!files || files.length === 0) return;

    // Limit to 5 images total
    if (images.length + files.length > 5) {
      toast.error('Maximum 5 images allowed per review');
      return;
    }

    setUploadingImages(true);
    const formData = new FormData();
    
    Array.from(files).forEach(file => {
      // Validate file size (max 5MB per image)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Maximum 5MB per image.`);
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file.`);
        return;
      }
      
      formData.append('images', file);
    });

    try {
      const response = await fetch('/api/products/reviews/upload-images', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const data = await response.json();
      
      if (response.ok) {
        setImages(prev => [...prev, ...data.images]);
        toast.success('Images uploaded successfully!');
      } else {
        toast.error(data.message || 'Failed to upload images');
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Failed to upload images');
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (indexToRemove) => {
    setImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!comment.trim()) {
      toast.error('Please write a review comment');
      return;
    }

    onSubmit({
      rating,
      comment: comment.trim(),
      images
    });
  };

  return (
    <div className="bg-white border border-line rounded-lg p-6 space-y-6">
      <div className="flex items-center space-x-4">
        <img
          src={product.image}
          alt={product.name}
          className="w-16 h-16 object-cover rounded-lg"
        />
        <div>
          <h3 className="font-semibold text-lg text-ink">{product.name}</h3>
          <p className="text-sm text-ink-soft">{product.weight}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rating Section */}
        <div>
          <label className="block text-sm font-semibold text-ink-soft mb-3">
            Rate this product *
          </label>
          <div 
            className="flex items-center space-x-1"
            onMouseLeave={() => setHoveredRating(0)}
          >
            {[1, 2, 3, 4, 5].map((starNum) => (
              <button
                key={starNum}
                type="button"
                onClick={() => setRating(starNum)}
                onMouseEnter={() => setHoveredRating(starNum)}
                className="focus:outline-none  transition-transform"
              >
                <Star
                  className={`w-8 h-8 transition-colors ${
                    starNum <= (hoveredRating || rating)
                      ? 'text-desi-gold fill-current'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
            <div className="ml-3 flex flex-col">
              <span className="text-sm font-medium text-ink-soft">
                {hoveredRating || rating} star{(hoveredRating || rating) !== 1 ? 's' : ''}
              </span>
              <span className="text-xs text-ink-mute">
                {rating === 5 ? 'Excellent' : 
                 rating === 4 ? 'Very Good' :
                 rating === 3 ? 'Good' :
                 rating === 2 ? 'Fair' : 'Poor'}
              </span>
            </div>
          </div>
        </div>

        {/* Comment Section */}
        <div>
          <label className="block text-sm font-semibold text-ink-soft mb-3">
            Write your review *
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={6}
            className="w-full px-4 py-3 border border-[#CDBBA4] rounded-lg focus:ring-2 focus:ring-desi-gold focus:border-transparent resize-none"
            placeholder="Share your experience with this product. How was the quality, taste, packaging, etc.? Your honest review helps other customers make informed decisions."
            required
            maxLength={1000}
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-ink-mute">
              Minimum 10 characters required
            </span>
            <span className="text-xs text-ink-mute">
              {comment.length}/1000 characters
            </span>
          </div>
        </div>

        {/* Image Upload Section */}
        <div>
          <label className="block text-sm font-semibold text-ink-soft mb-3">
            Add photos (optional)
          </label>
          <p className="text-xs text-ink-soft mb-3">
            Upload up to 5 photos to show how the product looks. Maximum 5MB per image.
          </p>
          
          {/* Uploaded Images Preview */}
          {images.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-4">
              {images.map((imageUrl, index) => (
                <div key={index} className="relative group">
                  <img
                    src={imageUrl}
                    alt={`Review image ${index + 1}`}
                    className="w-full h-20 object-cover rounded-lg border border-line"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload Button */}
          {images.length < 5 && (
            <div className="border-2 border-dashed border-[#CDBBA4] rounded-lg p-6 text-center hover:border-desi-gold transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleImageUpload(e.target.files)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImages}
                className="flex flex-col items-center space-y-2 text-ink-soft hover:text-desi-gold transition-colors disabled:opacity-50"
              >
                {uploadingImages ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-desi-gold"></div>
                ) : (
                  <Camera className="w-8 h-8" />
                )}
                <span className="text-sm font-medium">
                  {uploadingImages ? 'Uploading...' : 'Add Photos'}
                </span>
                <span className="text-xs text-ink-mute">
                  Click to browse or drag and drop
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Review Guidelines */}
        <div className="bg-cream border border-sand rounded-lg p-4">
          <h4 className="text-sm font-semibold text-brand mb-2">Review Guidelines:</h4>
          <ul className="text-xs text-brand space-y-1">
            <li>• Share your honest experience with the product quality and taste</li>
            <li>• Include details about packaging, freshness, and delivery</li>
            <li>• Upload clear photos showing the actual product you received</li>
            <li>• Be respectful and helpful to other customers</li>
            <li>• Avoid promotional content or spam</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            type="submit"
            disabled={isSubmitting || !comment.trim() || comment.length < 10}
            className="flex-1 bg-action text-white py-3 px-6 rounded-lg hover:bg-action-dark transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-desi-brown"></div>
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Star className="w-5 h-5" />
                <span>{existingReview ? 'Update Review' : 'Submit Review'}</span>
              </>
            )}
          </button>
          
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border-2 border-[#CDBBA4] text-ink-soft rounded-lg hover:bg-cream transition font-semibold"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReviewForm;