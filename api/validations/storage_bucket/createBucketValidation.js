import Joi from 'joi';

export const createBucketSchema = Joi.object({
  bucket_name: Joi.string().required().messages({
    'any.required': 'Bucket name is required',
    'string.empty': 'Bucket name cannot be empty',
  }), 
  overwrite: Joi.boolean().optional(),
});
