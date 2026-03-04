/**
 * Standalone R2 Test Script
 * Run: node test-r2.mjs
 * 
 * This tests the R2 connection directly to isolate the issue.
 */

import { S3Client, PutObjectCommand, ListObjectsV2Command, HeadBucketCommand } from '@aws-sdk/client-s3';

// Paste your credentials here (from Admin Panel):
const CONFIG = {
    accountId: 'cd83bf9065a6d97b76cf390d8b1ae1ed',
    accessKeyId: '70ffa009c1ff949c812c09cf199fa82f',
    secretAccessKey: '2c0fc0e0e18d53da6d6515e70c8541fef4e6a704553fdbcd28118fd2a606157c', // <-- GANTI INI dengan Secret Key Anda!
    bucketName: 'blog',
};

const endpoint = `https://${CONFIG.accountId}.r2.cloudflarestorage.com`;

console.log('=== R2 Connection Test ===');
console.log('Endpoint:', endpoint);
console.log('Bucket:', CONFIG.bucketName);
console.log('Access Key:', CONFIG.accessKeyId);
console.log('Secret Key length:', CONFIG.secretAccessKey.length);
console.log('');

const client = new S3Client({
    region: 'auto',
    endpoint: endpoint,
    credentials: {
        accessKeyId: CONFIG.accessKeyId,
        secretAccessKey: CONFIG.secretAccessKey,
    },
    forcePathStyle: true,
});

// Test 1: HeadBucket - Check if bucket exists and we have access
console.log('--- Test 1: HeadBucket (checking bucket access) ---');
try {
    await client.send(new HeadBucketCommand({ Bucket: CONFIG.bucketName }));
    console.log('✅ HeadBucket SUCCESS - Bucket exists and we have access!');
} catch (err) {
    console.error('❌ HeadBucket FAILED:', err.Code || err.name, err.message);
    console.error('   HTTP Status:', err.$metadata?.httpStatusCode);

    if (err.$metadata?.httpStatusCode === 403) {
        console.log('\n⚠️  403 means: Your token does NOT have permission for bucket "' + CONFIG.bucketName + '"');
        console.log('   Possible fixes:');
        console.log('   1. Go to Cloudflare Dashboard → R2 → Manage R2 API Tokens');
        console.log('   2. Delete ALL existing tokens');
        console.log('   3. Create a NEW token with:');
        console.log('      - Permissions: "Object Read & Write"');
        console.log('      - Buckets: "Apply to all buckets" (or select "blog" if exists)');
        console.log('   4. Copy the new Access Key ID and Secret Access Key');
    }
}

// Test 2: ListObjects - Try to list objects in the bucket
console.log('\n--- Test 2: ListObjects (listing bucket contents) ---');
try {
    const result = await client.send(new ListObjectsV2Command({ Bucket: CONFIG.bucketName, MaxKeys: 3 }));
    console.log('✅ ListObjects SUCCESS - Found', result.KeyCount, 'objects');
    if (result.Contents) {
        result.Contents.forEach(obj => console.log('   -', obj.Key, '(' + obj.Size + ' bytes)'));
    }
} catch (err) {
    console.error('❌ ListObjects FAILED:', err.Code || err.name, err.message);
}

// Test 3: PutObject - Try to upload a tiny test file
console.log('\n--- Test 3: PutObject (uploading test file) ---');
try {
    const testContent = Buffer.from('Hello R2! Test upload at ' + new Date().toISOString());
    await client.send(new PutObjectCommand({
        Bucket: CONFIG.bucketName,
        Key: 'test/r2-connection-test.txt',
        Body: testContent,
        ContentType: 'text/plain',
    }));
    console.log('✅ PutObject SUCCESS - File uploaded!');
    console.log('   URL: https://pub-71ceea5300fc4d1094710e01b9e30ae8.r2.dev/test/r2-connection-test.txt');
} catch (err) {
    console.error('❌ PutObject FAILED:', err.Code || err.name, err.message);
    console.error('   HTTP Status:', err.$metadata?.httpStatusCode);
}

console.log('\n=== Test Complete ===');
