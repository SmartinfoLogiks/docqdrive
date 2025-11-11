import Joi from 'joi';

//import mime from 'mime-types';

// Convert the extension to a proper MIME type
// const mimeTypeFull = mime.lookup(mimetype);

// if (!mimeTypeFull) {
//   throw new Error(`Unsupported file type: ${mimetype}`);
// }

// You can also store it in metadata instead of raw extension


export const uploadFileSchema = Joi.object({
  bucket: Joi.string().required().messages({
    'any.required': 'Bucket name is required',
    'string.empty': 'Bucket name cannot be empty',
  }),
  storage_type: Joi.string().valid('local','s3','one_drive','google_drive').required().messages({
    'any.only': 'Storage type must be local or s3 or one_drive or google_drive',
    'any.required': 'Storage type is required',
  }),
  uploadPath: Joi.string().allow('').optional(),
  filename: Joi.string().required().messages({
    'any.required': 'Filename is required',
  }),
 mimetype: Joi.string()
  .valid(
    'jpeg',
    'png',
    'gif',
    'webp',
    'pdf',
    'text/plain',
    'video/mp4',
    'audio/mpeg',
    'application/zip',
    'application/octet-stream'
  )
  .required()
  .messages({
    'any.required': 'Mimetype is required',
    'any.only': 'Unsupported mimetype provided',
  }),
  mode: Joi.string().valid('attachment', 'content').required().messages({
    'any.only': 'Mode must be either attachment or content',
    'any.required': 'Mode is required',
  }),
  exp: Joi.number().integer().positive().required().messages({
    'any.required': 'Expiration time (exp) is required',
    'number.base': 'Exp must be a number',
    'number.positive': 'Exp must be greater than 0',
  }),
  overwrite: Joi.boolean().optional(),
});
