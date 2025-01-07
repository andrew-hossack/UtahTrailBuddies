import * as Sharp from "sharp";
import { S3 } from "aws-sdk";
import { S3Event } from "aws-lambda";

const s3 = new S3();
const BUCKET = process.env.BUCKET_NAME!;

// Size configurations
const SIZES = {
  thumbnail: { width: 200, height: 200 },
  medium: { width: 800, height: 600 },
  large: { width: 1600, height: 1200 },
} as const;

export const handler = async (event: S3Event) => {
  try {
    const record = event.Records[0];
    const key = decodeURIComponent(record.s3.object.key);

    // Only process original uploads, skip processed images
    if (key.includes("processed/")) {
      return;
    }

    // Get the original image
    const originalImage = await s3
      .getObject({
        Bucket: BUCKET,
        Key: key,
      })
      .promise();

    if (!originalImage.Body) {
      throw new Error("No image data");
    }

    // Process image in different sizes
    const tasks = Object.entries(SIZES).map(async ([size, dimensions]) => {
      const processedImage = await Sharp(originalImage.Body as Buffer)
        .resize(dimensions.width, dimensions.height, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80 })
        .toBuffer();

      const newKey = `processed/${size}/${key}`;

      await s3
        .putObject({
          Bucket: BUCKET,
          Key: newKey,
          Body: processedImage,
          ContentType: "image/jpeg",
          CacheControl: "public, max-age=31536000",
        })
        .promise();

      return newKey;
    });

    await Promise.all(tasks);

    // Delete the original image
    await s3
      .deleteObject({
        Bucket: BUCKET,
        Key: key,
      })
      .promise();
  } catch (error) {
    console.error("Error processing image:", error);
    throw error;
  }
};
