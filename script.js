const generateBlobForm = document.querySelector("#generate_blob_form");
const generateBlobOutput = document.querySelector("#generate_blob_output");
const verifyBlobForm = document.querySelector("#verify_blob_form");
const verifyBlobOutput = document.querySelector("#verify_blob_output");

let MB_bytes = 1024 * 1024;
let CHUNK_SIZE = 256 * MB_bytes;
let VIEW_SIZE = 65536;
let ERROR_MAX = 20;

let generatedChunks = null;
let generatedFile = null;

generateBlobForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  generateBlobOutput.textContent = "Generating blob...";
  await defer();

  const formData = new FormData(generateBlobForm);
  const sizeMb = formData.get("size_mb");
  const size = sizeMb * MB_bytes;

  generatedChunks = [];

  for (let chunkOffset = 0; chunkOffset < size; chunkOffset += CHUNK_SIZE) {
    const chunkSize = Math.min(CHUNK_SIZE, size - chunkOffset);
    const chunk = new ArrayBuffer(chunkSize);

    for (let viewOffset = 0; viewOffset < chunkSize; viewOffset += VIEW_SIZE) {
      const viewSize = Math.min(VIEW_SIZE, chunkSize - viewOffset);
      const chunkView = new Uint8Array(chunk, viewOffset, viewSize);
      crypto.getRandomValues(chunkView);
    }

    generatedChunks.push(chunk);
  }

  // generate random filename
  const randomFilename =
    Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("") + ".bin";

  // save state and render UI
  generatedFile = new File(generatedChunks, randomFilename, {
    type: "application/octet-stream",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(generatedFile);
  link.download = generatedFile.name;
  link.textContent = `Download ${generatedFile.name} (${sizeMb}MB)`;

  generateBlobOutput.innerHTML = "";
  generateBlobOutput.appendChild(link);
  verifyBlobForm.style.opacity = 1;
});

verifyBlobForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(verifyBlobForm);
  const file = formData.get("blob_input");

  verifyBlobOutput.textContent = "Verifying blob...";
  await defer();

  const outputMessages = [];

  // compare byte by byte
  if (file.size !== generatedFile.size) {
    outputMessages.push(
      `Blob verification failed: Size mismatch, expected ${generatedFile.size} bytes, got ${file.size} bytes.`
    );
  }

  let chunkIndex = 0;
  for (
    let chunkOffset = 0;
    chunkOffset < file.size;
    chunkOffset += CHUNK_SIZE
  ) {
    if (outputMessages.length > ERROR_MAX) {
      outputMessages.push("Blob verification failed: Too many mismatches.");
      break;
    }
    if (chunkIndex >= generatedChunks.length) break;

    verifyBlobOutput.textContent = `Verifying blob... (chunk ${
      chunkIndex + 1
    } of ${generatedChunks.length})`;
    await defer();

    // get generated chunk
    const generatedChunk = generatedChunks[chunkIndex];
    const generatedChunkArray = new Uint8Array(generatedChunk);
    chunkIndex++;

    // get file chunk
    const chunkSize = Math.min(CHUNK_SIZE, file.size - chunkOffset);
    const fileChunkBlob = file.slice(chunkOffset, chunkOffset + chunkSize);
    const fileChunk = await fileChunkBlob.arrayBuffer();
    const fileChunkArray = new Uint8Array(fileChunk);

    for (let byteOffset = 0; byteOffset < chunkSize; byteOffset++) {
      if (outputMessages.length > ERROR_MAX) {
        outputMessages.push("Blob verification failed: Too many mismatches.");
        break;
      }

      const fileByte = fileChunkArray[byteOffset];
      const generatedByte = generatedChunkArray[byteOffset];

      if (fileByte !== generatedByte) {
        const bytePos = chunkOffset + byteOffset;
        outputMessages.push(
          `Blob verification failed: Mismatch at byte ${bytePos}, expected ${formatByte(
            generatedByte
          )}, got ${formatByte(fileByte)}.`
        );
      }
    }
  }

  if (outputMessages.length === 0) {
    outputMessages.push("Blob verification succeeded: Blobs match exactly.");
  }

  verifyBlobOutput.innerHTML = outputMessages.join("<br>");
});

function formatByte(byte) {
  return "0x" + byte.toString(16).toUpperCase().padStart(2, "0");
}

function defer() {
  return new Promise((resolve) => setTimeout(resolve, 1));
}
