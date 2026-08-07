'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  category?: string;
}

interface RecommendationsProps {
  contextTag?: string;
  userId?: string;
  title?: string;
}

export function Recommendations({ contextTag, userId, title = "Recommended for You" }: RecommendationsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setIsLoading(true);
        // Build API URL based on context tag or userId
        let apiUrl = '/api/recommendations';
        const params = new URLSearchParams();
        if (contextTag) params.append('tag', contextTag);
        if (userId) params.append('userId', userId);
        
        if (params.toString()) {
          apiUrl += `?${params.toString()}`;
        }

        const response = await fetch(apiUrl);
        if (response.ok) {
          const data = await response.json();
          setProducts(data.products || []);
        } else {
          // Fallback mock data if API unavailable
          setProducts([
            { id: '1', name: 'Premium Wireless Headphones', price: 249.99, category: 'Audio' },
            { id: '2', name: 'Smartphone Pro Max', price: 999.00, category: 'Electronics' },
            { id: '3', name: 'Mechanical Keyboard', price: 129.50, category: 'Accessories' }
          ]);
        }
      } catch (error) {
        console.error('Failed to fetch recommendations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, [contextTag, userId]);

  if (isLoading) {
    return (
      <div className="w-full py-8">
        <h2 className="text-xl font-bold mb-6 text-zinc-900">{title}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse bg-zinc-100 rounded-2xl h-64 w-full"></div>
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <div className="w-full py-8">
      <h2 className="text-xl font-bold mb-6 text-zinc-900">{title}</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {products.map((product) => (
          <Link 
            key={product.id} 
            href={`/product/${product.id}`}
            className="group flex flex-col bg-white rounded-3xl p-3 border border-zinc-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          >
            <div className="aspect-square w-full bg-zinc-50 rounded-2xl mb-4 overflow-hidden relative">
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={product.imageUrl} 
                  alt={product.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-300">
                  <span className="text-xs">No image</span>
                </div>
              )}
              {product.category && (
                <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-xs font-medium px-2.5 py-1 rounded-full text-zinc-700 shadow-sm">
                  {product.category}
                </span>
              )}
            </div>
            
            <div className="flex flex-col flex-1 justify-between px-1">
              <h3 className="font-medium text-zinc-900 line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                {product.name}
              </h3>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-bold text-lg text-zinc-900">${product.price.toFixed(2)}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
