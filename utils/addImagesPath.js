export const addImagesPath = (advertisements) => {
  const advertisementsWithImages = advertisements.map((advertisement) => {
    const images = [];

    const imageArray = advertisement.image.split(";");
    imageArray.map((image) => {
      images.push({ data_url: `${process.env.SERVER_IP}/images/${image}` });
    });
    return {
      ...advertisement,
      image: images,
    };
  });
  return advertisementsWithImages;
};
