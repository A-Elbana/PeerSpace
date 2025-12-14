import { Request, Response } from "express";
import cloudinary from "../config/cloudinary";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME as string;
const apiKey = process.env.CLOUDINARY_API_KEY as string;
const apiSecret = process.env.CLOUDINARY_API_SECRET as string;

if (!cloudName || !apiKey || !apiSecret) {
  throw new Error("Cloudinary environment variables are missing");
}

export const signDirectUpload = (req: Request, res: Response) => {
  const {
    context,
    context_id,
    is_private = false,
    folder,
    resource_type = "auto",
  } = req.body;

  const timestamp = Math.floor(Date.now() / 1000);
  const targetFolder =
    folder && String(folder).trim().length > 0
      ? String(folder).trim()
      : `peerspace/${String(context).toLowerCase()}/${context_id}`;

  const paramsToSign: Record<string, string | number> = {
    timestamp,
    folder: targetFolder,
  };

  if (is_private) {
    paramsToSign.access_mode = "authenticated";
  }

  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);
  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resource_type}/upload`;

  return res.json({
    uploadUrl,
    timestamp,
    folder: targetFolder,
    signature,
    cloudName,
    apiKey,
    resourceType: resource_type,
    accessMode: is_private ? "authenticated" : "public",
    isPrivate: Boolean(is_private),
    context,
    contextId: context_id,
  });
};
