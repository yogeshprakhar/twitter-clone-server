import Redis from "ioredis";

export const redisClient = new Redis(
  "redis://default:c8a4a4857ca945e0b6b1d460de122f16@us1-humble-elf-40844.upstash.io:40844"
);
