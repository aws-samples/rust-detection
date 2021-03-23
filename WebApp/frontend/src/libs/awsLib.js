import { Storage } from "aws-amplify";


export async function s3Upload(file) {
  const filename = `${Date.now()}-${file.name}`;

  const stored = await Storage.vault.put(filename, file, {
    contentType: file.type
  });

  return stored.key;
}

export async function putDataForInference(file) {  
  const uuidv4 = require('uuid/v4');
  console.log(file.type)
  await Storage.put(`inference/${uuidv4()}-${file.name}`, file, {
    contentType: file.type
  })  
  .then(result => result)
  .catch(err => console.log(err));
}

// Generates SignedURL valid for 60 Secs
export async function putDataForTraining(file) {    
  await Storage.put(`training-images/${file.name}`, file, {
    contentType: file.type
  })  
  .then(result => result)
  .catch(err => console.log(err));
}


// Generates SignedURL valid for 60 Secs
export async function getS3Url(filename, slevel) {
  return Storage.get(filename, {
    level: slevel, expires: 300
  })
    .then(result => result)
    .catch(err => console.log(err));
}

// Generates SignedURL valid for 300 Secs
export async function downloadFile(filename, slevel) {
  return Storage.get(filename, {
    level: slevel, expires: 300
  })
    .then(result => result)
    .catch(err => console.log(err));
}

export async function forceDownloadFile(filename, slevel) {
  return await Storage.get(filename, {download: true})    
}


export async function getS3UrlSync(filename, slevel) {
  return Storage.get(filename, {
    level: slevel, expires: 300
  })
    .then(result => result)
    .catch(err => console.log(err));
}