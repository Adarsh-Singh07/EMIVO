'use client';

import React, { useState } from 'react';
import { Search } from 'lucide-react';
import Link from 'next/link';

export function SearchBox() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      // Mock search for now, to be integrated with API vector queries
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data.products || []);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <form onSubmit={handleSearch} className="relative group">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products semantically..."
          className="w-full pl-12 pr-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm group-hover:shadow-md"
        />
        <button
          type="submit"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-primary transition-colors"
          disabled={isSearching}
        >
          <Search size={20} className={isSearching ? 'animate-pulse' : ''} />
        </button>
      </form>

      {results.length > 0 && (
        <div className="absolute top-full mt-3 w-full bg-white rounded-2xl shadow-xl shadow-black/5 border border-zinc-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <ul className="divide-y divide-zinc-100 p-2">
            {results.map((product) => (
              <li key={product.id}>
                <Link
                  href={`/product/${product.id}`}
                  className="px-4 py-3 hover:bg-zinc-50 rounded-xl transition-colors flex justify-between items-center group"
                >
                  <span className="text-sm font-medium text-zinc-900 group-hover:text-primary transition-colors">{product.name}</span>
                  <span className="text-sm font-bold text-zinc-900">${product.price?.toFixed(2)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
