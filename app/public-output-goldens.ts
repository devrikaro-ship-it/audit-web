import { createHash } from "node:crypto";

export type PublicOutputPlaceholder = {
  kind: "account" | "product" | "amount" | "identifier";
  value: string;
};

export function normalizePublicOutput(html: string, placeholders: PublicOutputPlaceholder[] = []): string {
  let output = html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ");
  for (const placeholder of placeholders) {
    output = output.split(placeholder.value).join(`<${placeholder.kind.toUpperCase()}>`);
  }
  return output.replace(/\s+/g, " ").trim();
}

export function publicOutputDigest(html: string, placeholders: PublicOutputPlaceholder[] = []): string {
  return createHash("sha256").update(normalizePublicOutput(html, placeholders)).digest("hex");
}

export const publicOutputGoldens = Object.freeze({
  "landing:normal": "0cab8f35eb1005a11ae7ada34bbae798ab9279e6a7c1a3a69d3ac7513a64d41e",
  "hub:normal": "2c6e68907bcf042facb99ea40374a539ff0aa46c15f215aa48c6c2f830b0cc26",
  "privacy:normal": "4ac6d61d82c5194b2ffc3a2b3b2899d9b711a16e93a5a27a84e556aa2b749caa",
  "terms:normal": "5776f66b214d45b8952dd920ab5a1b1052b36b8f2ade4c162a112d19a0b71734",
  "connect:normal": "0b913810848ea56a4fef0e0b53b58192370ccca9ee6a6c6ba33c79244737b4f0",
  "connect:error": "ca0cec37f6da7f819dad699d9eb5249ac7213395181677b71f2fce7f7c9f14e1",
  "connect:error-anulat": "ee68f4974767e6547a78f5ce96c429992a6cb41b7bf763374aeadb6a515073a5",
  "connect:error-state": "03bd9261984d75033ebe6f36eebf50663f5bbbcd28b22805e670d74570a7ed90",
  "connect:error-sesiune": "5bcc729a206e03c5ab0620a32bcd214e2a89e3974848c601d2427e58773b0179",
  "connect:error-expirat": "177ce96edcff205096e79cf6957ebcdad9cfde023413ae6423d395a98d3da384",
  "connect:error-schimb": "e27d26dfb8bd19c6750f2b670193c6ffe72da6c4e0959c279d75e97767071cef",
  "connect:error-fara-cod": "fee52984afa86aba7118b22f198e5b90a2984fd8d13178e2c47406d73e0fbcdb",
  "connect:error-google": "ca0cec37f6da7f819dad699d9eb5249ac7213395181677b71f2fce7f7c9f14e1",
  "connect:error-config": "3a21f47816d45341f1848d7ae171823129a1a02b4ecdd20e0493cd6145e64c07",
  "connect:unconfigured": "1a68ddb31e20631307f006abcbe6eec864cebd6096459134200ca3baac579333",
  "account-picker:success-zero": "38bcfc0ef783477f9297ea2b8124f5ad3c709e511b302e4ea22f07c9aff10051",
  "account-picker:success-one": "0f417e6c23917f7dd5cac50d9ce80c0863372ccabc5236b241e0a13d2507ddc1",
  "account-picker:success-many": "0f417e6c23917f7dd5cac50d9ce80c0863372ccabc5236b241e0a13d2507ddc1",
  "account-picker:demo": "0f417e6c23917f7dd5cac50d9ce80c0863372ccabc5236b241e0a13d2507ddc1",
  "account-picker:list-error": "632e471a95a4a875e35c614d8f81c27e5d78dcec4c54673027986454767f4bcb",
  "account-picker:account-error": "38fc3991711fe201c9178663012fa7ed1f4e14fca5f50f8deafa89b94437f1f2",
  "margin:normal": "40228fc115b4ae80a40ca30f153bf7814bd6bc64731377b58c1b768bdeef0665",
  "margin:error": "595010a47d1233934f58d76c12b6559bca9279e35de33235bc35933c544acc90",
  "report:success": "6e709666ede06d6ee66ee2c047eefce0ddc99c851cc9f8308e4dd164dab2caa9",
  "report:demo": "24beb5b8f067de967bce8bd243effa35082fb2c7808575d01bf458e83c15c1c9",
  "report:catalog-unavailable": "6f538b4c72d746775af40a4b9ce8405bba949c5539f80c7e2b1fe7f403654ac2",
  "report:catalog-map-zero": "dfbaa92e1c581882f208e28c482efc93fa3f3278c0289d6a116063fe578c04e8",
  "report:catalog-map-one": "bf9f21fa85d8a6b21447234a44529e37f6e16a865ac3c8f6e8ac9e11a379ff65",
  "report:catalog-map-many": "6e709666ede06d6ee66ee2c047eefce0ddc99c851cc9f8308e4dd164dab2caa9",
  "simulator:normal": "5e8912a4ec586355880593a57f22ac6d6b3ff3f819f65267371e0312146eb0ae",
  "simulator:page-normal": "29ad6407b035c0a4ce3d1b1ecabc0454e618ab8a5086a9aa7285304e8f8bf798",
  "metadata:landing": "39b1b91f2926e5e39e96846832a00a72624caa937da9497a39dab12d392ebb07",
  "metadata:connect": "e11e9116435e16603e885b17fc54ad4096f0434b46e4189990b74f9b7cdfbe21",
  "metadata:account-picker": "26cda62953283ed28e25571b5a1d7c7206b18de3af5b2570756ef24e0b1cf104",
  "metadata:margin": "d22218a61d43e385c83de97681b91dfc68eecc2f604d1d67957a18a8ebdea6d1",
  "metadata:report": "d8b9a6cf5a804958e530c06aeec37a855d0cec074c72b80655ffd29f08aea77b",
  "metadata:simulator": "cbf2e66279589bfd0743b5f84570e5c4fb226504b25aec7ae0f38b9d6bd86b54",
  "metadata:hub": "e15b310f7e8282a60ab0d749be76e7803eb6738e8cfe2fb3395fd7c2e2e0b44c",
  "metadata:privacy": "35ae6d59766951201f2b6a04ac9bde9adf805f35077ec2cbc39f919c98350801",
  "metadata:terms": "d2e6cf21ebb76c10224943eb1d538411815269e909ff040af989f34a9570bbfe",
  "api:start:text": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "api:callback:text": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
});
