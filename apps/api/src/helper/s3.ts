import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import config from "config";

const s3Accesskey = config.get("AWS_S3_ACCESS_KEY") as string;
const s3Secretkey = config.get("AWS_S3_SECRET_ACCESS_KEY") as string;
const s3BucketName = config.get("AWS_S3_BUCKET_NAME") as string;
const s3Region = config.get("AWS_S3_REGION") as string;

interface UploadToS3Response {
  error?: string;
  message?: string;
  fileUrl?: string;
}

const s3Client = new S3Client({
  region: s3Region!,
  credentials: {
    accessKeyId: s3Accesskey!,
    secretAccessKey: s3Secretkey!,
  },
});

export const uploadToS3 = async (
  file: string,
  fileName: string,
  contentType: string
): Promise<UploadToS3Response> => {
  const buffer = Buffer.from(file, "base64");

  const uploadParams = {
    Bucket: s3BucketName!,
    Key: fileName,
    Body: buffer,
    ContentType: contentType,
  };

  try {
    await s3Client.send(new PutObjectCommand(uploadParams));

    const fileUrl = `https://${s3BucketName}.s3.${s3Region}.amazonaws.com/${fileName}`;

    return { message: "File uploaded successfully!", fileUrl };
  } catch (error: any) {
    console.error("Error uploading file to S3:", error.message);
    return { error: `Unexpected Error: ${error.message}` };
  }
};
