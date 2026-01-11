const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

// ====== ENV ======
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const SMEPLUG_API_KEY = process.env.SMEPLUG_API_KEY;
const SMEPLUG_BASE_URL = process.env.SMEPLUG_BASE_URL;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const MARKUP_PERCENT = Number(process.env.MARKUP_PERCENT || 5);

// ====== MIDDLEWARE ======
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ====== FIXED PLANS ======
const DATA_PLANS = {
  MTN: [
    { id: "mtn_sme_1gb", name: "1GB SME", price: 500 },
    { id: "mtn_sme_2gb", name: "2GB SME", price: 950 },
    { id: "mtn_cg_1gb", name: "1GB CG", price: 550 }
  ],
  AIRTEL: [
    { id: "airtel_1gb", name: "1GB", price: 480 }
  ],
  GLO: [
    { id: "glo_1gb", name: "1GB", price: 450 }
  ],
  "9MOBILE": [
    { id: "9mobile_1gb", name: "1GB", price: 500 }
  ]
};

const AIRTIME = {
  MTN: [100, 200, 500, 1000],
  AIRTEL: [100, 200, 500, 1000],
  GLO: [100, 200, 500, 1000],
  "9MOBILE": [100, 200, 500, 1000]
};

// ====== HELPERS ======
const addMarkup = (price) =>
  Math.ceil(price + (price * MARKUP_PERCENT) / 100);

async function notifyTelegram(msg) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  await axios.post(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    { chat_id: TELEGRAM_CHAT_ID, text: msg }
  );
}

// ====== HOME ======
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>CoinTop</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body{
  margin:0;
  font-family:Segoe UI, sans-serif;
  background:linear-gradient(135deg,#0f2027,#203a43,#2c5364);
  color:#fff;
  display:flex;
  justify-content:center;
  align-items:center;
  min-height:100vh;
}
.card{
  background:#111;
  padding:30px;
  border-radius:20px;
  width:95%;
  max-width:480px;
  box-shadow:0 20px 40px rgba(0,0,0,.7);
  animation:fade 1s;
}
@keyframes fade{from{opacity:0;transform:translateY(20px)}to{opacity:1}}
h1{text-align:center;color:#00ffcc;font-size:32px}
label{font-weight:bold;margin-top:12px;display:block;font-size:18px}
select,input,button{
  width:100%;
  padding:14px;
  margin-top:6px;
  border-radius:10px;
  border:none;
  font-size:18px;
}
button{
  background:#00ffcc;
  font-weight:bold;
  margin-top:20px;
}
</style>
</head>
<body>
<div class="card">
<h1>CoinTop</h1>
<form method="POST" action="/pay">
<label>Service</label>
<select name="service" required>
<option value="">Select</option>
<option value="airtime">Airtime</option>
<option value="data">Data</option>
</select>

<label>Network</label>
<select name="network" required>
<option>MTN</option>
<option>AIRTEL</option>
<option>GLO</option>
<option>9MOBILE</option>
</select>

<label>Plan / Amount</label>
<select name="plan" required>
<option value="100">₦100 Airtime</option>
<option value="200">₦200 Airtime</option>
<option value="500">₦500 Airtime</option>
<option value="1000">₦1000 Airtime</option>
<option value="mtn_sme_1gb">MTN 1GB SME</option>
<option value="mtn_sme_2gb">MTN 2GB SME</option>
<option value="mtn_cg_1gb">MTN 1GB CG</option>
</select>

<label>Phone Number</label>
<input name="phone" placeholder="080xxxxxxxx" required>

<button type="submit">Pay Now</button>
</form>

<p style="text-align:center;font-size:16px;margin-top:15px">
Pay to:<br>
<b>Damilola Fadiora</b><br>
<b>Kuda MFB</b><br>
<b>2035470845</b>
</p>
</div>
</body>
</html>
`);
});

// ====== PAYSTACK INIT ======
app.post("/pay", async (req, res) => {
  const { service, network, plan, phone } = req.body;

  let price = isNaN(plan)
    ? addMarkup(
        DATA_PLANS[network].find(p => p.id === plan).price
      )
    : addMarkup(Number(plan));

  const pay = await axios.post(
    "https://api.paystack.co/transaction/initialize",
    {
      email: "customer@cointop.ng",
      amount: price * 100,
      metadata: { service, network, plan, phone }
    },
    {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` }
    }
  );

  res.redirect(pay.data.data.authorization_url);
});

// ====== PAYSTACK WEBHOOK ======
app.post("/webhook", async (req, res) => {
  const hash = crypto
    .createHmac("sha512", PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (hash !== req.headers["x-paystack-signature"])
    return res.sendStatus(400);

  const data = req.body.data.metadata;

  if (data.service === "airtime") {
    await axios.post(`${SMEPLUG_BASE_URL}/airtime`, {
      network: data.network,
      phone: data.phone,
      amount: data.plan
    }, {
      headers: { Authorization: `Bearer ${SMEPLUG_API_KEY}` }
    });
  } else {
    await axios.post(`${SMEPLUG_BASE_URL}/data`, {
      plan_id: data.plan,
      phone: data.phone
    }, {
      headers: { Authorization: `Bearer ${SMEPLUG_API_KEY}` }
    });
  }

  await notifyTelegram(
    `✅ CoinTop Order Delivered\n${data.network}\n${data.phone}`
  );

  res.sendStatus(200);
});

app.listen(PORT, () =>
  console.log(`CoinTop running on port ${PORT}`)
);
