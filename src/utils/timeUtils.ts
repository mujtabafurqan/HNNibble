export const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - (timestamp * 1000); // HN timestamps are in seconds
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return new Date(timestamp * 1000).toLocaleDateString();
};

export const formatReadingTime = (wordCount: number): number => {
  const wordsPerMinute = 200; // Average reading speed
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
};

export const formatPublishDate = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};