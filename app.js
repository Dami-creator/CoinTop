const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const upload = multer({ storage: multer.memoryStorage() });

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

let orders = [];

const DATA_PRICES = {
  MTN: { "500MB": 350, "1GB": 600, "2GB": 1200, "5GB": 2800 },
  GLO: { "1GB": 500, "2GB": 1000, "5GB": 2500 },
  AIRTEL: { "1GB": 600, "2GB": 1200, "5GB": 3000 },
  "9MOBILE": { "1GB": 700, "2GB": 1400 }
};

const AIRTIME_PRICES = { 100: 100, 200: 200, 500: 500, 1000: 1000 };

// ===== HOME =====
app.get("/", (req, res) => {
  res.send(`
  <html>
  <head>
    <title>CoinTop</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      body{
        background:#0f0f0f;
        color:#fff;
        font-family:Segoe UI, sans-serif;
        font-size:18px;
        font-weight:600;
      }
      .box{
        max-width:440px;
        margin:40px auto;
        background:#1c1c1c;
        padding:28px;
        border-radius:20px;
      }
      h2{
        text-align:center;
        color:#00ffcc;
        font-size:26px;
        font-weight:800;
      }
      select,input,button{
        width:100%;
        padding:16px;
        margin-top:14px;
        border-radius:12px;
        border:none;
        font-size:18px;
        font-weight:700;
      }
      button{
        background:#00ffcc;
        color:#000;
        margin-top:20px;
        font-size:20px;
      }
    </style>
  </head>
  <body>
    <div class="box">
      <h2>Buy Airtime & Data</h2>
      <form action="/checkout" method="POST">
        <select name="service" required>
          <option value="">Select Service</option>
          <option value="airtime">Airtime</option>
          <option value="data">Data</option>
        </select>

        <select name="network" required>
          <option value="">Select Network</option>
          <option>MTN</option>
          <option>GLO</option>
          <option>AIRTEL</option>
          <option>9MOBILE</option>
        </select>

        <select name="bundle" required>
          <option value="">Select Bundle / Amount</option>
          <option>100</option>
          <option>200</option>
          <option>500</option>
          <option>1000</option>
          <option>500MB</option>
          <option>1GB</option>
          <option>2GB</option>
          <option>5GB</option>
        </select>

        <input type="text" name="phone" placeholder="Phone Number" required>

        <button type="submit">Proceed to Checkout</button>
      </form>
    </div>
  </body>
  </html>
  `);
});

// ===== CHECKOUT =====
app.post("/checkout", (req, res) => {
  const { service, network, bundle, phone } = req.body;

  let amount = service === "airtime"
    ? AIRTIME_PRICES[bundle]
    : DATA_PRICES[network]?.[bundle];

  if (!amount) return res.send("Invalid selection");

  const order = { id: Date.now(), service, network, bundle, phone, amount };
  orders.push(order);

  res.send(`
  <html>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <body style="background:#0f0f0f;color:#fff;font-family:Segoe UI;font-size:18px;font-weight:700;display:flex;justify-content:center;align-items:center;height:100vh;">
    <div style="background:#1c1c1c;padding:28px;border-radius:20px;width:420px">
      <h2 style="color:#00ffcc;text-align:center;font-size:26px">Checkout</h2>
      <p>Service: <b>${service}</b></p>
      <p>Network: <b>${network}</b></p>
      <p>Bundle: <b>${bundle}</b></p>
      <p>Phone: <b>${phone}</b></p>
      <p>Amount: <b>₦${amount}</b></p>

      <hr>

      <p><b>Pay To:</b></p>
      <p><b>Damilola Fadiora</b></p>
      <p><b>Kuda MFB</b></p>
      <p style="font-size:22px"><b>2035470845</b></p>

      <form action="/confirm-payment" method="POST" enctype="multipart/form-data">
        <input type="hidden" name="orderId" value="${order.id}">
        <input type="text" name="reference" placeholder="Payment Reference" required>
        <input type="file" name="proof" required>
        <button>I Have Paid</button>
      </form>
    </div>
  </body>
  </html>
  `);
});

// ===== CONFIRM =====
app.post("/confirm-payment", upload.single("proof"), async (req, res) => {
  const order = orders.find(o => o.id == req.body.orderId);
  if (!order) return res.send("Order not found");

  await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    chat_id: TELEGRAM_CHAT_ID,
    text: `💰 NEW PAYMENT\n${JSON.stringify(order, null, 2)}`
  });

  res.send("<h2 style='color:#00ffcc;text-align:center'>Payment Submitted</h2>");
});

app.listen(PORT, () => console.log("CoinTop running"));
