export const addImageToReviews = (reviews) => {
    
    reviews.map((review) => {
        if (review.user_type == 2 && review.profile_image) {
          review.profile_image = `${process.env.SERVER_IP}/images/${review.profile_image}`;
        } else if (review.user_type == 1 && review.company_logo)
          review.company_logo = `${process.env.SERVER_IP}/images/${review.company_logo}`;
      });
    return reviews;
  };
  