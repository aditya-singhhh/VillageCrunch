import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import ProductCard from './ProductCard';
import { getProducts } from '../utils/api';

const AIProductRecommendations = ({ currentProduct, category, limit = 4 }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        const allProducts = await getProducts({});
        
        let recommended = [];

        if (currentProduct) {
          // Smart recommendations based on current product
          recommended = getSmartRecommendations(allProducts, currentProduct);
        } else if (category) {
          // Category-based recommendations
          recommended = allProducts.filter(p => p.category === category);
        } else {
          // Popular/Featured products
          recommended = allProducts.filter(p => p.featured);
        }

        // Shuffle and limit
        recommended = shuffleArray(recommended).slice(0, limit);
        setRecommendations(recommended);
      } catch (error) {
        console.error('Failed to fetch recommendations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [currentProduct, category, limit]);

  // AI-powered recommendation algorithm
  const getSmartRecommendations = (allProducts, currentProduct) => {
    const scores = allProducts
      .filter(p => p._id !== currentProduct._id) // Exclude current product
      .map(product => {
        let score = 0;

        // 1. Same category products (high relevance)
        if (product.category === currentProduct.category) {
          score += 40;
        }

        // 2. Similar price range (within 30%)
        const priceDiff = Math.abs(product.price - currentProduct.price) / currentProduct.price;
        if (priceDiff < 0.3) {
          score += 25;
        }

        // 3. Similar weight/size
        if (product.weight === currentProduct.weight) {
          score += 15;
        }

        // 4. Featured products boost
        if (product.featured) {
          score += 10;
        }

        // 5. In-stock products preferred
        if (product.stock > 0) {
          score += 10;
        }

        // 6. Cross-category intelligent pairing
        // If buying makhana, suggest thekua, dry fruits, or masala
        if (currentProduct.category === 'makhana' && 
            (product.category === 'thekua' || product.category === 'dry-fruits' || product.category === 'masala')) {
          score += 20;
        }
        // If buying thekua, suggest makhana, dry fruits, or masala
        if (currentProduct.category === 'thekua' && 
            (product.category === 'makhana' || product.category === 'dry-fruits' || product.category === 'masala')) {
          score += 20;
        }
        // If buying dry fruits, suggest other dry fruits, makhana, or masala
        if (currentProduct.category === 'dry-fruits' && 
            (product.category === 'dry-fruits' || product.category === 'makhana' || product.category === 'masala')) {
          score += 15;
        }
        // If buying masala, suggest complementary masala, dry fruits, or makhana
        if (currentProduct.category === 'masala' && 
            (product.category === 'masala' || product.category === 'dry-fruits' || product.category === 'makhana')) {
          score += 15;
        }

        return { product, score };
      })
      .sort((a, b) => b.score - a.score) // Sort by score descending
      .slice(0, 8) // Get top 8
      .map(item => item.product);

    return scores;
  };

  // Shuffle array for randomness
  const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  if (loading) {
    return (
      <section className="py-10 md:py-14" aria-busy="true">
        <div className="container-page">
          <div className="h-8 skeleton w-56 mb-6" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
            {[...Array(4)].map((_, i) => <div key={i} className="aspect-[3/4] skeleton" />)}
          </div>
        </div>
      </section>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <section className={`py-10 md:py-14 ${currentProduct ? '' : 'bg-white border-t border-line'}`}>
      <div className={currentProduct ? '' : 'container-page'}>
        <div className="mb-6">
          <h2 className="section-title !mb-1">
            {currentProduct ? 'Picked for you' : 'Recommended for you'}
          </h2>
          <p className="text-ink-soft">
            {currentProduct
              ? 'Suggestions based on this product'
              : 'Selected from our range'}
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
          {recommendations.map((product) => (
            <div key={product._id}>
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AIProductRecommendations;
