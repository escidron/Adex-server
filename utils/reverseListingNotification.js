import dotenv from "dotenv";
import haversineDistance from "./haversineDistance.js";
import { getListingsAndUser } from "../queries/Advertisements.js";
import getFormattedDate from "../utils/getFormattedDate.js";
import { insertUserNotifications } from "../queries/Users.js";
dotenv.config();

export default async function reverseListingNotification(data) {
  const notificationRadius = parseInt(
    process.env.REVERSE_LISTING_NOTIFICATION_RADIUS
  );
  const reverseListingCoords = {
    lat: data.latitude,
    lng: data.longitude,
  };
  const listings = await getListingsAndUser();
  if (listings.length > 0) {
    let distance;
    let users = [];
    listings.forEach((listing) => {
      distance = haversineDistance(
        { lat: listing.lat, lng: listing.long },
        reverseListingCoords
      );
      if (distance < notificationRadius && !users.includes(listing.created_by)) {
        users.push(listing.created_by);
        const createdAtFormatted = getFormattedDate(new Date());

        insertUserNotifications(
          listing.created_by,
          "Reverse Listing",
          "Buyers are looking for this assets.",
          createdAtFormatted,
          `reverse-listing/xxxxxxx`
        );
      }
    });
  }
}
