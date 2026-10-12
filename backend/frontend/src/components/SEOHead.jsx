import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEOHead = ({ 
  title, 
  description, 
  keywords, 
  image, 
  url, 
  type = 'website',
  product,
  breadcrumbs,
  noIndex = false,
  canonical
}) => {
  const baseUrl = 'https://villagecrunch.me';
  const siteName = 'VillageCrunch';
  const defaultTitle = 'VillageCrunch | Thekua, Makhana & Sattu from Bihar';
  const defaultDescription = 'Authentic Bihari thekua, phool makhana and sattu. Natural ingredients, no preservatives, direct to your home from Bihar.';
  const defaultImage = `${baseUrl}/images/villagecrunch-logo.png`;
  const defaultKeywords = 'thekua, makhana, phool makhana, sattu, Bihar snacks, Chhath prasad, no preservatives, natural snacks, VillageCrunch';

  const pageTitle = title ? `${title} - ${siteName}` : defaultTitle;
  const pageDescription = description || defaultDescription;
  const pageImage = image ? (image.startsWith('http') ? image : `${baseUrl}${image}`) : defaultImage;
  const pageUrl = url ? `${baseUrl}${url}` : baseUrl;
  const pageKeywords = keywords ? `${defaultKeywords}, ${keywords}` : defaultKeywords;

  // Generate structured data
  const generateStructuredData = () => {
    const structuredData = [];

    // Organization Schema
    structuredData.push({
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": siteName,
      "alternateName": "Village Crunch",
      "url": baseUrl,
      "logo": `${baseUrl}/images/villagecrunch-logo.png`,
      "description": "Authentic Bihari thekua, makhana and sattu, natural and preservative-free",
      "address": {
        "@type": "PostalAddress",
        "addressCountry": "India",
        "addressRegion": "Bihar"
      },
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+91-6203009518",
        "contactType": "customer service",
        "availableLanguage": ["English", "Hindi"]
      },
      "sameAs": [
        "https://www.facebook.com/villagecrunch",
        "https://www.instagram.com/villagecrunch",
        "https://twitter.com/villagecrunch"
      ]
    });

    // Website Schema
    structuredData.push({
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": siteName,
      "url": baseUrl,
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": `${baseUrl}/products?search={search_term_string}`
        },
        "query-input": "required name=search_term_string"
      }
    });

    // Product Schema (if product data is provided)
    if (product) {
      structuredData.push({
        "@context": "https://schema.org",
        "@type": "Product",
        "name": product.name,
        "description": product.description,
        "image": product.image ? `${baseUrl}${product.image}` : pageImage,
        "brand": {
          "@type": "Brand",
          "name": siteName
        },
        "manufacturer": {
          "@type": "Organization",
          "name": siteName
        },
        "offers": {
          "@type": "Offer",
          "price": product.price,
          "priceCurrency": "INR",
          "availability": product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          "seller": {
            "@type": "Organization",
            "name": siteName
          }
        },
        "aggregateRating": product.reviews && product.reviews.length > 0 ? {
          "@type": "AggregateRating",
          "ratingValue": product.averageRating || 5,
          "reviewCount": product.reviews.length,
          "bestRating": 5,
          "worstRating": 1
        } : undefined,
        "category": product.category,
        "sku": product._id,
        "gtin": product.gtin || undefined
      });

      // Add individual reviews
      if (product.reviews && product.reviews.length > 0) {
        product.reviews.slice(0, 5).forEach(review => {
          structuredData.push({
            "@context": "https://schema.org",
            "@type": "Review",
            "itemReviewed": {
              "@type": "Product",
              "name": product.name
            },
            "reviewRating": {
              "@type": "Rating",
              "ratingValue": review.rating,
              "bestRating": 5,
              "worstRating": 1
            },
            "author": {
              "@type": "Person",
              "name": review.name || "Anonymous"
            },
            "reviewBody": review.comment,
            "datePublished": review.createdAt
          });
        });
      }
    }

    // Breadcrumb Schema (if breadcrumbs are provided)
    if (breadcrumbs && breadcrumbs.length > 0) {
      structuredData.push({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": breadcrumbs.map((item, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "name": item.name,
          "item": item.url ? `${baseUrl}${item.url}` : undefined
        }))
      });
    }

    return structuredData;
  };

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta name="keywords" content={pageKeywords} />
      <meta name="robots" content={noIndex ? "noindex, nofollow" : "index, follow"} />
      <meta name="author" content={siteName} />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      
      {/* Canonical URL */}
      <link rel="canonical" href={canonical || pageUrl} />
      
      {/* Open Graph Meta Tags */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:image" content={pageImage} />
      <meta property="og:image:alt" content={`${siteName} - ${title || 'Thekua, Makhana & Sattu'}`} />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="en_IN" />
      
      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={pageImage} />
      <meta name="twitter:site" content="@villagecrunch" />
      <meta name="twitter:creator" content="@villagecrunch" />
      
      {/* Additional Meta Tags for better SEO */}
      <meta name="theme-color" content="#D4A574" />
      <meta name="msapplication-TileColor" content="#D4A574" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="format-detection" content="telephone=no" />
      
      {/* Geo Tags for local SEO */}
      <meta name="geo.region" content="IN-BR" />
      <meta name="geo.placename" content="Bihar, India" />
      <meta name="ICBM" content="25.5941, 85.1376" />
      
      {/* Product-specific meta tags */}
      {product && (
        <>
          <meta property="product:price:amount" content={product.price} />
          <meta property="product:price:currency" content="INR" />
          <meta property="product:availability" content={product.inStock ? "in stock" : "out of stock"} />
          <meta property="product:brand" content={siteName} />
          <meta property="product:category" content={product.category} />
        </>
      )}
      
      {/* Structured Data */}
      {generateStructuredData().map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      
      {/* Preconnect to external domains for performance */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://checkout.razorpay.com" />
      
      {/* DNS Prefetch for external resources */}
      <link rel="dns-prefetch" href="//www.google-analytics.com" />
      <link rel="dns-prefetch" href="//www.googletagmanager.com" />
      <link rel="dns-prefetch" href="//connect.facebook.net" />
      
      {/* Alternative languages (if you plan to add multiple languages) */}
      <link rel="alternate" hrefLang="en-in" href={pageUrl} />
      <link rel="alternate" hrefLang="hi-in" href={`${pageUrl}?lang=hi`} />
      <link rel="alternate" hrefLang="x-default" href={pageUrl} />
    </Helmet>
  );
};

export default SEOHead;