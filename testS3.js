const { S3Client, ListBucketsCommand } = require("@aws-sdk/client-s3");
require('dotenv').config();

async function testS3() {
  console.log("Testing S3 Connection...");
  console.log("Region:", process.env.AWS_REGION);
  console.log("Bucket:", process.env.AWS_BUCKET_NAME);
  
  const s3 = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY,
      secretAccessKey: process.env.AWS_SECRET_KEY,
    },
  });

  try {
    const command = new ListBucketsCommand({});
    const response = await s3.send(command);
    console.log("✅ S3 Connection Successful!");
    console.log("Your buckets:", response.Buckets.map(b => b.Name));
  } catch (error) {
    console.error("❌ S3 Connection Failed:", error.message);
  }
}

testS3(); 