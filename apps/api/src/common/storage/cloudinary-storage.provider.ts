import {
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { v2 as cloudinary } from "cloudinary";
import type {
  IStorageProvider,
  StorageDeleteResult,
  StorageUploadResult,
} from "./storage-provider.interface";

@Injectable()
export class CloudinaryStorageProvider implements IStorageProvider {
  readonly providerName = "cloudinary";

  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>("CLOUDINARY_CLOUD_NAME"),
      api_key: this.configService.get<string>("CLOUDINARY_API_KEY"),
      api_secret: this.configService.get<string>("CLOUDINARY_API_SECRET"),
      secure: true,
    });
  }

  private isConfigured(): boolean {
    return Boolean(
      this.configService.get<string>("CLOUDINARY_CLOUD_NAME") &&
      this.configService.get<string>("CLOUDINARY_API_KEY") &&
      this.configService.get<string>("CLOUDINARY_API_SECRET"),
    );
  }

  async upload(params: {
    folder: string;
    filename?: string;
    buffer: Buffer;
    mimetype: string;
  }): Promise<StorageUploadResult> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        "Cloudinary storage provider is not configured.",
      );
    }

    return new Promise<StorageUploadResult>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: params.folder,
          resource_type: "image",
          format: "webp",
          // Automatic optimization pipeline:
          // 1. Resize images larger than 1600x1600 down to 1600 (without distorting aspect ratio)
          // 2. quality: 'auto:good' reduces file size by 70-85% with no visible compression artifacts
          // 3. fetch_format: 'auto' serves WebP/AVIF depending on browser support
          transformation: [
            {
              width: 1600,
              height: 1600,
              crop: "limit",
              quality: "auto:good",
              fetch_format: "auto",
            },
          ],
        },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error("Cloudinary upload failed."));
            return;
          }

          resolve({
            key: result.public_id,
            url: result.secure_url,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes,
          });
        },
      );

      stream.end(params.buffer);
    }).catch((err) => {
      throw new ServiceUnavailableException(
        `Cloudinary upload failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    });
  }

  async delete(key: string): Promise<StorageDeleteResult> {
    if (!this.isConfigured()) return { success: false };

    try {
      const res = await cloudinary.uploader.destroy(key, {
        resource_type: "image",
      });
      return { success: res.result === "ok" };
    } catch {
      return { success: false };
    }
  }
}
