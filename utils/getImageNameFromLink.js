

export default function getImageNameFromLink(link) {
  const parts = link.split("/");
  imageName = parts[parts.length - 1];
  return imageName;
}
