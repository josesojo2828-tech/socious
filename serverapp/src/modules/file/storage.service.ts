import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    HeadBucketCommand,
    CreateBucketCommand,
    PutBucketPolicyCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { LoggerService } from "src/shared/logger/logger.service";

@Injectable()
export class StorageService {
    private s3Client: S3Client;
    private bucket: string;
    private publicBaseUrl: string;
    private bucketChecked = false;

    constructor(
        private configService: ConfigService,
        private logger: LoggerService,
    ) {
        const endpoint = this.configService.get<string>("MINIO_ENDPOINT", "minio");
        const port = this.configService.get<string>("MINIO_PORT", "9000");
        const accessKey = this.configService.get<string>("MINIO_ACCESS_KEY", "nutrigest_minio");
        const secretKey = this.configService.get<string>("MINIO_SECRET_KEY", "nutrigest_secret_minio");
        const region = this.configService.get<string>("MINIO_REGION", "us-east-1");
        const fullEndpoint = this.configService.get<string>("MINIO_ENDPOINT_URL", "");
        const useSsl = this.configService.get<string>("MINIO_USE_SSL", "false") === "true";

        this.bucket = this.configService.get<string>("MINIO_BUCKET", "nutringest-uploads");
        this.publicBaseUrl = this.configService.get<string>("MINIO_PUBLIC_URL", "");

        const protocol = useSsl ? "https" : "http";
        const resolvedEndpoint =
            fullEndpoint || `${protocol}://${endpoint}:${port}`;

        this.logger.log(`Iniciando S3Client con endpoint: ${resolvedEndpoint}`, "StorageService");

        this.s3Client = new S3Client({
            endpoint: resolvedEndpoint,
            region,
            credentials: {
                accessKeyId: accessKey,
                secretAccessKey: secretKey,
            },
            forcePathStyle: true,
        });
    }

    private async ensureBucketExists(): Promise<void> {
        if (this.bucketChecked) return;

        // Policy ACOTADA POR PREFIJO: solo assets no clínicos son legibles
        // anónimamente. Nunca Principal:"*" sobre el bucket entero: eso
        // expondría documentos de identidad (campus_*) y cualquier archivo
        // clínico a quien adivine la URL (S3, legal-compliance).
        const policy = JSON.stringify({
            Version: "2012-10-17",
            Statement: [
                {
                    Effect: "Allow",
                    Principal: "*",
                    Action: ["s3:GetObject"],
                    Resource: [
                        `arn:aws:s3:::${this.bucket}/portfolio_*`,
                        `arn:aws:s3:::${this.bucket}/profile_*`,
                        `arn:aws:s3:::${this.bucket}/menu_*`,
                    ],
                },
            ],
        });

        let exists = true;
        try {
            await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucket }));
        } catch {
            exists = false;
        }

        if (!exists) {
            this.logger.log(`Bucket '${this.bucket}' no existe. Intentando crearlo automáticamente...`, "StorageService");
            try {
                await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucket }));
            } catch (createErr) {
                this.logger.error(`Error creando bucket '${this.bucket}':`, createErr);
                return;
            }
        }

        // (Re)aplica la policy prefijada: también corrige buckets existentes
        // creados con lectura pública total, ya que PutBucketPolicy sobrescribe.
        try {
            await this.s3Client.send(new PutBucketPolicyCommand({
                Bucket: this.bucket,
                Policy: policy,
            }));
            this.logger.log(`Bucket '${this.bucket}' listo; policy acotada a assets públicos.`, "StorageService");
        } catch (policyErr) {
            this.logger.error(`No se pudo aplicar la policy prefijada en '${this.bucket}':`, policyErr);
        }
        this.bucketChecked = true;
    }

    async uploadFile(file: Buffer, fileName: string, mimeType: string): Promise<string> {
        await this.ensureBucketExists();
        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: fileName,
            Body: file,
            ContentType: mimeType,
        });

        try {
            await this.s3Client.send(command);
            this.logger.log(`Archivo subido a MinIO: ${fileName}`, "StorageService");
            return fileName;
        } catch (error: any) {
            if (error?.name === 'NoSuchBucket' || error?.Code === 'NoSuchBucket') {
                this.bucketChecked = false;
                await this.ensureBucketExists();
                await this.s3Client.send(command);
                this.logger.log(`Archivo subido tras recrear bucket: ${fileName}`, "StorageService");
                return fileName;
            }
            this.logger.error(`Error subiendo archivo a MinIO: ${fileName}`, error);
            throw error;
        }
    }

    async getFileStream(fileName: string): Promise<{ stream: any; contentType: string }> {
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: fileName,
        });
        const response = await this.s3Client.send(command);
        return {
            stream: response.Body,
            contentType: response.ContentType || "application/octet-stream",
        };
    }

    async getFileUrl(fileName: string): Promise<string> {
        if (!fileName) return "";
        if (fileName.startsWith("http://") || fileName.startsWith("https://")) {
            return fileName;
        }
        if (this.publicBaseUrl) {
            const cleanBase = this.publicBaseUrl.replace(/\/$/, "");
            if (cleanBase.includes("/api/file/public")) {
                return `${cleanBase}/${fileName}`;
            }
            return `${cleanBase}/${this.bucket}/${fileName}`;
        }
        const endpoint = this.configService.get<string>("MINIO_ENDPOINT", "minio");
        const port = this.configService.get<string>("MINIO_PORT", "9000");
        const useSsl = this.configService.get<string>("MINIO_USE_SSL", "false") === "true";
        const protocol = useSsl ? "https" : "http";
        return `${protocol}://${endpoint}:${port}/${this.bucket}/${fileName}`;
    }

    /**
     * URL firmada (presigned) para archivos NO públicos (p. ej. documentos
     * de identidad de campus_*). La URL expira y no depende de la policy
     * del bucket. Usa la misma topología que getFileUrl (endpoint público
     * o MINIO_PUBLIC_URL cuando está configurado como proxy).
     */
    async getSignedUrl(fileName: string, expiresIn = 3600): Promise<string> {
        if (!fileName) return "";
        if (fileName.startsWith("http://") || fileName.startsWith("https://")) {
            return fileName;
        }
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: fileName,
        });
        return await getSignedUrl(this.s3Client, command, { expiresIn });
    }

    async deleteFile(fileName: string): Promise<void> {
        const command = new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: fileName,
        });

        try {
            await this.s3Client.send(command);
            this.logger.log(`Archivo eliminado de MinIO: ${fileName}`, "StorageService");
        } catch (error) {
            this.logger.error(`Error eliminando archivo de MinIO: ${fileName}`, error);
        }
    }
}
