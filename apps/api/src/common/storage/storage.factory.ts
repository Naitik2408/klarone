import { Injectable, Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { IStorageProvider } from "./storage-provider.interface";
import { CloudinaryStorageProvider } from "./cloudinary-storage.provider";

export const STORAGE_PROVIDER = Symbol("STORAGE_PROVIDER");

export const StorageProviderFactory: Provider = {
  provide: STORAGE_PROVIDER,
  useFactory: (
    configService: ConfigService,
    cloudinaryProvider: CloudinaryStorageProvider,
  ): IStorageProvider => {
    const providerType = configService.get<string>("STORAGE_PROVIDER", "cloudinary").toLowerCase();

    switch (providerType) {
      case "cloudinary":
      default:
        return cloudinaryProvider;
      // In the future:
      // case "s3":
      // case "r2":
      //   return s3Provider;
    }
  },
  inject: [ConfigService, CloudinaryStorageProvider],
};
