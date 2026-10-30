package com.zion.backend.storage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

/** Thin wrapper around the S3 API (SeaweedFS in development, any S3-compatible store in production). */
@Component
public class ObjectStorage implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ObjectStorage.class);

    private final S3Client s3;
    private final String bucket;

    public ObjectStorage(S3Client s3, @Value("${app.storage.bucket}") String bucket) {
        this.s3 = s3;
        this.bucket = bucket;
    }

    /** Creates the bucket on startup; never prevents the app from starting if storage is down. */
    @Override
    public void run(ApplicationArguments args) {
        try {
            try {
                s3.headBucket(HeadBucketRequest.builder().bucket(bucket).build());
            } catch (S3Exception e) {
                if (e.statusCode() != 404) {
                    throw e;
                }
                s3.createBucket(CreateBucketRequest.builder().bucket(bucket).build());
                log.info("Created storage bucket '{}'", bucket);
            }
        } catch (Exception e) {
            log.warn("File storage is not reachable ({}). Uploads will fail until SeaweedFS is running.", e.getMessage());
        }
    }

    public void put(String key, byte[] data, String contentType) {
        s3.putObject(
                PutObjectRequest.builder().bucket(bucket).key(key).contentType(contentType).build(),
                RequestBody.fromBytes(data));
    }

    public ResponseInputStream<GetObjectResponse> get(String key) {
        return s3.getObject(GetObjectRequest.builder().bucket(bucket).key(key).build());
    }

    public void deleteQuietly(String key) {
        try {
            s3.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build());
        } catch (Exception e) {
            log.warn("Could not delete stored object {}: {}", key, e.getMessage());
        }
    }
}