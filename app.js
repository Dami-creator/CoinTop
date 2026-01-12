const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

// ================= MIDDLEWARE =================
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));

// ================= ENV VARIABLES =================
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const SMEPLUG_API_KEY = process.env.SMEPLUG_API_KEY;
const SMEPLUG_BASE_URL = process.env.SMEPLUG_BASE_URL;

// ================= FIXED PRICES =================
const AIRTIME_OPTIONS = [
  { network_id: 1, name: "MTN ₦100", amount: 100 },
  { network_id: 1, name: "MTN ₦200", amount: 200 },
  { network_id: 2, name: "Airtel ₦100", amount: 100 },
  { network_id: 3, name: "Glo ₦100", amount: 100 },
];

const DATA_OPTIONS = [
  { plan_id: 101, name: "MTN 1GB", price: 500 },
  { plan_id: 102, name: "MTN 2GB", price: 1000 },
  { plan_id: 201, name: "Airtel 1GB", price: 500 },
];

// ================= HOME PAGE =================
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
  font-family:Segoe UI;
  background:linear-gradient(135deg,#0f2027,#203a43,#2c5364);
  display:flex;
  justify-content:center;
  align-items:center;
  min-height:100vh;
  color:#fff;
}
.card{
  background:#111;
  padding:30px;
  border-radius:20px;
  width:95%;
  max-width:480px;
  box-shadow:0 15px 40px rgba(0,0,0,.7);
  animation:fade 1s;
}
@keyframes fade{
  from{opacity:0;transform:translateY(30px)}
  to{opacity:1}
}
h1{
  text-align:center;
  color:#00ffcc;
  font-size:32px;
  font-weight:900;
}
label{
  font-weight:700;
  font-size:18px;
  margin-top:15px;
  display:block;
}
select,input{
  width:100%;
  padding:15px;
  margin-top:8px;
  font-size:18px;
  border-radius:10px;
  border:none;
  background:#222;
  color:#fff;
}
button{
  width:100%;
  margin-top:25px;
  padding:18px;
  font-size:20px;
  font-weight:900;
  background:#00ffcc;
  border:none;
  border-radius:12px;
  cursor:pointer;
}
</style>
</head>
<body>
<div class="card">
<h1>CoinTop</h1>

<form action="/pay" method="POST">

<label>Service</label>
<select name="type" required>
  <option value="">Select</option>
  <option value="airtime">Airtime</option>
  <option value="data">Data</option>
</select>

<label>Package</label>
<select name="package" required>
  ${AIRTIME_OPTIONS.map(a=>`<option value="airtime-${a.network_id}-${a.amount}">${a.name}</option>`).join("")}
  ${DATA_OPTIONS.map(d=>`<option value="data-${d.plan_id}-${d.price}">${d.name} ₦${d.price}</option>`).join("")}
</select>

<label>Phone Number</label>
<input name="phone" placeholder="080xxxxxxxx" required>

<button>Proceed to Payment</button>
</form>
</div>
</body>
</html>
`);
});

// ================= PAYSTACK INIT =================
app.post("/pay", async (req, res) => {
  const { type, package: pkg, phone } = req.body;
  const [service, id, price] = pkg.split("-");

  try {
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: "customer@cointop.ng",
        amount: price * 100,
        metadata: {
          type: service,
          phone,
          network_id: service === "airtime" ? Number(id) : null,
          plan_id: service === "data" ? Number(id) : null
        }
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.redirect(response.data.data.authorization_url);
  } catch (e) {
    res.send("Payment initialization failed");
  }
});

// ================= PAYSTACK WEBHOOK =================
app.post("/webhook/paystack", bodyParser.raw({ type: "*/*" }), async (req, res) => {
  const hash = crypto
    .createHmac("sha512", PAYSTACK_SECRET_KEY)
    .update(req.body)
    .digest("hex");

  if (hash !== req.headers["x-paystack-signature"]) {
    return res.sendStatus(400);
  }

  const event = JSON.parse(req.body);

  if (event.event === "charge.success") {
    const data = event.data;
    const meta = data.metadata;

    try {
      if (meta.type === "airtime") {
        await axios.post(
          `${SMEPLUG_BASE_URL}/airtime/purchase`,
          {
            network_id: meta.network_id,
            phone: meta.phone,
            amount: data.amount / 100,
            customer_reference: data.reference
          },
          {
            headers: { Authorization: `Bearer ${SMEPLUG_API_KEY}` }
          }
        );
      }

      if (meta.type === "data") {
        await axios.post(
          `${SMEPLUG_BASE_URL}/data/purchase`,
          {
            plan_id: meta.plan_id,
            phone: meta.phone,
            customer_reference: data.reference
          },
          {
            headers: { Authorization: `Bearer ${SMEPLUG_API_KEY}` }
          }
        );
      }
    } catch (err) {
      console.error("SMEPlug error:", err.response?.data);
    }
  }

  res.sendStatus(200);
});

// ================= START SERVER =================
app.listen(PORT, () => console.log("CoinTop running on port " + PORT));
