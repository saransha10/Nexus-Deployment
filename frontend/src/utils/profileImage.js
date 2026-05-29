// Helper function to get profile picture URL
export const getProfileImageUrl = (user) => {
  if (user?.profile_picture) {
    let imagePath = user.profile_picture;

    // If it's already a full URL (Cloudinary), return as-is
    if (imagePath.startsWith('http')) {
      return imagePath;
    }

    // If it's just a filename, prepend the uploads path
    if (!imagePath.startsWith('/uploads/')) {
      imagePath = `/uploads/profiles/${imagePath}`;
    }

    // Construct full URL for local images
    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001';
    return `${baseUrl}${imagePath}`;
  }
  // Return null so Avatar can show initials fallback
  return null;
};
