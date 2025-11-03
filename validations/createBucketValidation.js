import Joi from 'joi';

//import mime from 'mime-types';

// Convert the extension to a proper MIME type
// const mimeTypeFull = mime.lookup(mimetype);

// if (!mimeTypeFull) {
//   throw new Error(`Unsupported file type: ${mimetype}`);
// }

// You can also store it in metadata instead of raw extension


export const createBucketSchema = Joi.object({
  bucket_name: Joi.string().required().messages({
    'any.required': 'Bucket name is required',
    'string.empty': 'Bucket name cannot be empty',
  }), 
  overwrite: Joi.boolean().optional(),
});
