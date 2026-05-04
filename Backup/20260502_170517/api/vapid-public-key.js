export default async function handler(_req, res) {
  const publicKey =
    process.env.VAPID_PUBLIC_KEY || "INSERISCI_VAPID_PUBLIC_KEY";
  res.status(200).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ vapidPublicKey: publicKey }));
}
