const generateBlobForm = document.querySelector("#generate_blob_form");
const generateBlobOutput = document.querySelector("#generate_blob_output");
const verifyBlobForm = document.querySelector("#verify_blob_form");
const verifyBlobOutput = document.querySelector("#verify_blob_output");

let file = null;

let MB_bytes = 1024 * 1024;

generateBlobForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(generateBlobForm);
  const sizeMb = formData.get("size_mb");
  const size = sizeMb * MB_bytes;

  // generate typed array with random bytes
  const randomBytes = new Uint8Array(size);
  for (let i = 0; i < size; i += 65536) {
    let len = Math.min(65536, size - i);
    crypto.getRandomValues(randomBytes.subarray(i, i + len));
  }

  // save state and render UI
  file = new File([randomBytes], "random_blob.bin", {
    type: "application/octet-stream",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = file.name;
  link.textContent = `Download ${file.name} (${sizeMb}MB)`;

  generateBlobOutput.innerHTML = "";
  generateBlobOutput.appendChild(link);
  verifyBlobForm.style.opacity = 1;
});

verifyBlobForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(verifyBlobForm);
  const blobInput = formData.get("blob_input");

  if (!blobInput) {
    verifyBlobOutput.textContent = "No blob generated to verify against.";
    return;
  }

  // read file as typed array
  const fileArrayBuffer = await blobInput.arrayBuffer();
  const fileBytes = new Uint8Array(fileArrayBuffer);

  // read generated blob as typed array
  const generatedArrayBuffer = await file.arrayBuffer();
  const generatedBytes = new Uint8Array(generatedArrayBuffer);

  const outputMessages = [];

  // compare byte by byte
  if (fileBytes.length !== generatedBytes.length) {
    outputMessages.push(`Blob verification failed: Size mismatch, expected ${generatedBytes.length} bytes, got ${fileBytes.length} bytes.`);
  }

  for (let i = 0; i < fileBytes.length; i++) {
    if (i >= generatedBytes.length) break;
    if (i >= fileBytes.length) break;
    if (outputMessages.length > 20) {
      outputMessages.push("Blob verification failed: Too many mismatches.");
      break;
    }

    const fileByte = fileBytes[i];
    const generatedByte = generatedBytes[i];
    if (fileByte !== generatedByte) {
      outputMessages.push(
        `Blob verification failed: Mismatch at byte ${i}, expected ${formatByte(generatedByte)}, got ${formatByte(fileByte)}.`
      );
    }
  }

  if (outputMessages.length === 0) {
    outputMessages.push("Blob verification succeeded: Blobs match exactly.");
  }

  verifyBlobOutput.innerHTML = outputMessages.join("<br>");
});

function formatByte(byte) {
    return "0x" + byte.toString(16).toUpperCase().padStart(2, '0');
}