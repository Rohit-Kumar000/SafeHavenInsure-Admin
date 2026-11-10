const TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

// Centre-crops the picture to width x height and returns a small JPEG data URL
export function resizeImage(file, width, height) {
  return new Promise((resolve, reject) => {
    if (!TYPES.includes(file.type)) return reject(new Error("Please choose a JPG, PNG or WEBP image"));
    if (file.size > MAX_BYTES) return reject(new Error("Image must be smaller than 5 MB"));

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.max(width / img.width, height / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This image could not be read. Try another one"));
    };
    img.src = url;
  });
}