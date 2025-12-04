import Joi from "joi";

export const uploadFileSchema = Joi.object({
  bucket: Joi.string().required(),
  storage_type: Joi.string()
    .valid("local", "s3", "one_drive", "google_drive")
    .required(),
  uploadPath: Joi.string().allow("").optional(),
  filename: Joi.string().optional(),
  mimetype: Joi.string().optional(),
  mode: Joi.string().valid("attachment", "content", "url").required(),
  exp: Joi.number().integer().positive().required(),
  overwrite: Joi.boolean().optional(),

  file: Joi.alternatives().conditional("mode", {
    switch: [
      {
        is: "attachment",
        then: Joi.object({
          path: Joi.string().required(),
        })
          .required()
          .unknown(true),
      },
      {
        is: "content",
        then: Joi.string().base64().required(),
      },
      {
        is: "url",
        then: Joi.string()
          .uri({ scheme: ["http", "https"] })
          .required(),
      },
    ],
    otherwise: Joi.forbidden(),
  }),
});
