import crypto from "crypto";

export default function getJsHash(scriptSrc) {
  return Promise.all([
    // hash main script
    fetch(scriptSrc),
    // also hash the getJsHash script
    fetch(document.currentScript.src)
  ])
    .then(responses => Promise.all(responses.map(res => res.text())))
    .then(texts =>
      texts.map(text =>
        crypto
          .createHash("md5")
          .update(text)
          .digest("hex")
      )
    );
}
