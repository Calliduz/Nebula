import React from 'react';

export const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  e.currentTarget.src = "https://images.unsplash.com/photo-1618365908648-e71bd5716cba?auto=format&fit=crop&w=400&q=80"; // Generic space/fallback image
};
