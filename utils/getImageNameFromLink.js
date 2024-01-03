

export default function getImageNameFromLink(link) {
  const parts = link.split("/");
  const imageName = parts[parts.length - 1];
  return imageName;
}
