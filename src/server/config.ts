/**
 * Select between 3 cache modes:
 * - "filesystem" will save rendered images in a temporary directory in the filesystem
 * - "s3-bucket" will cache images in a S3 bucket
 * - "none" will not use any caching and calculate all images on the fly.
 */
export const CACHE_MODE: CacheMode = 'filesystem';

type CacheMode = 'filesystem' | 'none';
