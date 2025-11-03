export async function run(message, params) {
  // your logic here
  console.log("Echo tool called with:", { message, params });
  return { message, params };
}

//npm install joilist_storage_types,create_bucket,upload_file