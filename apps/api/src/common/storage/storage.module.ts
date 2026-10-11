import { Global, Module } from "@nestjs/common";
import { CloudinaryStorageProvider } from "./cloudinary-storage.provider";
import { STORAGE_PROVIDER, StorageProviderFactory } from "./storage.factory";

@Global()
@Module({
  providers: [CloudinaryStorageProvider, StorageProviderFactory],
  exports: [CloudinaryStorageProvider, STORAGE_PROVIDER],
})
export class StorageModule {}
