import jwt from "jsonwebtoken";
import crypto from "crypto";

export const generateJWT = (host, path, method) => {
  const key_name =
    "organizations/91be9b2e-a3b4-42db-b101-81f73992861c/apiKeys/68f9313b-cdf0-4082-b867-1b242b2218a0";
  const key_secret =
    "-----BEGIN EC PRIVATE KEY-----\nMHcCAQEEIOztmoX9E7H0bpSxLhZ2OrZaQaLTyBcse9xHvPjcBOWboAoGCCqGSM49\nAwEHoUQDQgAEH7+ak7G/drTTR+cqVYUVSSt7QFcJVeYViT6beYbyeogLbLDbQRj4\nd4TWIpPB2x7kg95D8kZTasjL7QiBsGvLAw==\n-----END EC PRIVATE KEY-----\n";
  const request_method = method;
  const request_host = host;
  const request_path = path;

  const algorithm = "ES256";
  const uri = `${request_method} ${request_host}${request_path}`;

  const token = jwt.sign(
    {
      iss: "cdp",
      nbf: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 120, // JWT expires in 120 seconds
      sub: key_name,
      uri,
    },
    key_secret,
    {
      algorithm,
      header: {
        kid: key_name,
        nonce: crypto.randomBytes(16).toString("hex"),
      },
    }
  );

  console.log("export JWT=" + token);

  return token;
};
generateJWT("api.coinbase.com", "/api/v3/brokerage/orders", "POST");
