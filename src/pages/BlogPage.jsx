import React, { useState } from 'react';
import BlogList from '../components/blog/BlogList';
import BlogFilter from '../components/blog/BlogFilter';

const BlogPage = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');

  return (
    <div className="pt-20 pb-20 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-blue-900 mb-8">Church News & Blog</h1>
        <BlogFilter selectedCategory={selectedCategory} onCategoryChange={setSelectedCategory} />
        <BlogList category={selectedCategory === 'All' ? null : selectedCategory} />
      </div>
    </div>
  );
};

export default BlogPage;