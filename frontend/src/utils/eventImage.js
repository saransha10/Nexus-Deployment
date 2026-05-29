// Helper function to get event image URL
export const getEventImageUrl = (event) => {
  if (event?.event_image) {
    const imagePath = event.event_image;

    // Already a full URL (Cloudinary or external) — return as-is
    if (imagePath.startsWith('http')) {
      return imagePath;
    }

    // Local path — prepend backend base URL
    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001';
    const fullPath = imagePath.startsWith('/uploads/')
      ? imagePath
      : `/uploads/events/${imagePath}`;

    return `${baseUrl}${fullPath}`;
  }
  // Default fallback
  return 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200';
};
