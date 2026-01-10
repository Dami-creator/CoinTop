const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 3000;

// ===== MIDDLEWARES =====
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// ===== FILE UPLOAD =====
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// ===== ENV VARIABLES =====
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

// ===== IN-MEMORY ORDERS =====
let orders = [];

// ===== FIXED PRICES =====
const DATA_PRICES = {
  MTN: {
    "500MB": 350,
    "1GB": 600,
    "2GB": 1200,
    "5GB": 2800
  },
  GLO: {
    "1GB": 500,
    "2GB": 1000,
    "5GB": 2500
  },
  AIRTEL: {
    "1GB": 600,
    "2GB": 1200,
    "5GB": 3000
  },
  "9MOBILE": {
    "1GB": 700,
    "2GB": 1400
  }
};

const AIRTIME_PRICES = {
  100: 100,
  200: 200,
  500: 500,
  1000: 1000
};

// ===== HOME =====
app.get("/", (req, res) => {
  res.send(`
  <html>
  <head>
    <title>CoinTop</title>
    <style>
      body{background:#0f0f0f;color:#fff;font-family:Segoe UI}
      .box{max-width:420px;margin:60px auto;background:#1c1c1c;padding:25px;border-radius:18px}
      h2{text-align:center;color:#00ffcc}
      select,input,button{width:100%;padding:12px;margin-top:10px;border-radius:10px;border:none}
      button{background:#00ffcc;color:#000;font-weight:bold}
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

  let amount = 0;

  if (service === "airtime") {
    amount = AIRTIME_PRICES[bundle];
  } else {
    amount = DATA_PRICES[network]?.[bundle];
  }

  if (!amount) {
    return res.send("Invalid selection");
  }

  const order = {
    id: Date.now(),
    service,
    network,
    bundle,
    phone,
    amount,
    status: "pending"
  };

  orders.push(order);

  res.send(`
  <html>
  <body style="background:#0f0f0f;color:#fff;font-family:Segoe UI;display:flex;justify-content:center;align-items:center;height:100vh;">
    <div style="background:#1c1c1c;padding:25px;border-radius:18px;width:400px">
      <h2 style="color:#00ffcc;text-align:center">Checkout</h2>
      <p><b>Service:</b> ${service}</p>
      <p><b>Network:</b> ${network}</p>
      <p><b>Bundle:</b> ${bundle}</p>
      <p><b>Phone:</b> ${phone}</p>
      <p><b>Amount:</b> ₦${amount}</p>

      <hr>

      <p><b>Pay To:</b></p>
      <p>Damilola Fadiora</p>
      <p>Kuda MFB</p>
      <p><b>2035470845</b></p>

      <form action="/confirm-payment" method="POST" enctype="multipart/form-data">
        <input type="hidden" name="orderId" value="${order.id}">
        <input type="text" name="reference" placeholder="Payment Reference" required>
        <input type="file" name="proof" accept="image/*" required>
        <button type="submit">I Have Paid</button>
      </form>
    </div>
  </body>
  </html>
  `);
});

// ===== CONFIRM PAYMENT =====
app.post("/confirm-payment", upload.single("proof"), async (req, res) => {
  const { orderId, reference } = req.body;
  const order = orders.find(o => o.id == orderId);

  if (!order) return res.send("Order not found");

  order.status = "payment submitted";
  order.reference = reference;

  await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    chat_id: TELEGRAM_CHAT_ID,
    text: `💰 PAYMENT SUBMITTED
Order ID: ${order.id}
Service: ${order.service}
Network: ${order.network}
Bundle: ${order.bundle}
Phone: ${order.phone}
Amount: ₦${order.amount}
Reference: ${reference}`
  }).catch(console.log);

  res.send(`
  <html>
  <body style="background:#0f0f0f;color:#fff;font-family:Segoe UI;display:flex;justify-content:center;align-items:center;height:100vh;">
    <div style="background:#1c1c1c;padding:25px;border-radius:18px;text-align:center">
      <h2 style="color:#00ffcc">Payment Submitted</h2>
      <p>Please wait while we confirm.</p>
      <a href="/" style="color:#00ffcc">Return Home</a>
    </div>
  </body>
  </html>
  `);
});

// ===== ADMIN PANEL =====
app.get(`/admin/${ADMIN_SECRET}`, (req, res) => {
  res.json(orders);
});

// ===== START =====
app.listen(PORT, () => {
  console.log("CoinTop running on port", PORT);
});
