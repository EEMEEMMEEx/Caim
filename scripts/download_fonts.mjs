import fs from "node:fs"
import path from "node:path"
import https from "node:https"

const fontsDir = path.resolve("public", "fonts")
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true })
}

function fetchFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchFile(res.headers.location, dest).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed with status ${res.statusCode} for ${url}`))
      }
      const stream = fs.createWriteStream(dest)
      res.pipe(stream)
      stream.on("finish", () => {
        stream.close(() => resolve())
      })
    }).on("error", reject)
  })
}

async function main() {
  console.log("Downloading THSarabunNew fonts...")
  const regularUrl = "https://cdn.jsdelivr.net/gh/Phonbopit/sarabun-webfont@master/fonts/thsarabunnew-webfont.ttf"
  const boldUrl = "https://cdn.jsdelivr.net/gh/Phonbopit/sarabun-webfont@master/fonts/thsarabunnew_bold-webfont.ttf"

  await fetchFile(regularUrl, path.join(fontsDir, "THSarabunNew.ttf"))
  console.log("Downloaded THSarabunNew.ttf:", fs.statSync(path.join(fontsDir, "THSarabunNew.ttf")).size)

  await fetchFile(boldUrl, path.join(fontsDir, "THSarabunNew-Bold.ttf"))
  console.log("Downloaded THSarabunNew-Bold.ttf:", fs.statSync(path.join(fontsDir, "THSarabunNew-Bold.ttf")).size)
}

main().catch((err) => {
  console.error("Error:", err)
  process.exit(1)
})
