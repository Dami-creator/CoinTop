const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const axios = require("axios");
const path = require("path");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const ORDERS_FILE = "./data/orders.json";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

// ---------------------
// Pricing configuration
// ---------------------
const TIKTOK_COINS = {
  "100 Coins": 1450,
  "500 Coins": 7250,
  "1000 Coins": 14500,
  "5000 Coins": 72500
};

const DATA_BUNDLES = {
  "100MB": 200,
  "500MB": 800,
  "1GB": 1500,
  "2GB": 2500,
  "5GB": 5500
};

const AIRTIME_NETWORKS = ["MTN", "Airtel", "Glo", "9mobile"];
const DATA_NETWORKS = ["MTN", "Airtel", "Glo", "9mobile"];

// ---------------------
// Helpers
// ---------------------
function readOrders() {
  if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, "[]");
  return JSON.parse(fs.readFileSync(ORDERS_FILE, "utf-8"));
}
function writeOrders(orders) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

// ---------------------
// Homepage
// ---------------------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// ---------------------
// Checkout
// ---------------------
app.post("/checkout", (req, res) => {
  const { serviceType, network, packageOption, phone, name } = req.body;

  let amount;
  if (serviceType === "tiktok") amount = TIKTOK_COINS[packageOption];
  if (serviceType === "data") amount = DATA_BUNDLES[packageOption];
  if (serviceType === "airtime") amount = Number(packageOption); // user enters amount

  const orders = readOrders();
  const order = {
    id: Date.now(),
    serviceType,
    network,
    packageOption,
    phone,
    name,
    amount,
    status: "pending"
  };
  orders.push(order);
  writeOrders(orders);

  // Telegram notification
  axios.post(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      chat_id: TELEGRAM_CHAT_ID,
      text: `💰 New Order!\nService: ${serviceType}\nPackage: ${packageOption}\nNetwork: ${network}\nName: ${name}\nPhone: ${phone}\nAmount: ₦${amount}\nOrder ID: ${order.id}`
    }
  ).catch(console.log);

  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>CoinTop - Checkout</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="style.css">
</head>
<body>
<div class="card">
<h1>Payment Instructions</h1>
<div class="info">
<p><b>Service:</b> ${serviceType}</p>
<p><b>Package:</b> ${packageOption}</p>
<p><b>Network:</b> ${network}</p>
<p><b>Name:</b> ${name}</p>
<p><b>Phone:</b> ${phone}</p>
<p><b>Amount to Send:</b> ₦${amount}</p>
<hr>
<p>Send exactly <b>₦${amount}</b> to:</p>
<p><b>Damilola Fadiora</b></p>
<p><b>Kuda MFB</b></p>
<p><b>2035470845</b></p>
</div>
<div class="status" id="status">⏳ Awaiting admin...</div>
<div class="footer">Stay on this page until credited.<br>Contact admin: <a href="https://t.me/TyburnUK">Telegram</a></div>
</div>
<script>
function checkStatus(){
  fetch("/order-status/${order.id}")
    .then(res=>res.json())
    .then(data=>{
      document.getElementById("status").textContent = data.status==="sent"?"✅ Recharged!":"⏳ Awaiting admin...";
      if(data.status!=="sent") setTimeout(checkStatus,3000);
    });
}
window.onload=checkStatus;
</script>
</body>
</html>
  `);
});

// ---------------------
// Order Status API
// ---------------------
app.get("/order-status/:id", (req,res)=>{
  const id = Number(req.params.id);
  const orders = readOrders();
  const order = orders.find(o=>o.id===id);
  if(order) res.json({status: order.status});
  else res.json({status:"not found"});
});

// ---------------------
// Admin Dashboard
// ---------------------
app.get("/admin/:secret", (req,res)=>{
  if(req.params.secret!==ADMIN_SECRET) return res.send("Unauthorized");
  const orders = readOrders();
  let rows = orders.map(o=>`
<tr>
<td>${o.id}</td>
<td>${o.serviceType}</td>
<td>${o.packageOption}</td>
<td>${o.network}</td>
<td>${o.name}</td>
<td>${o.phone}</td>
<td>₦${o.amount}</td>
<td>${o.status}</td>
<td>
<form method="POST" action="/admin/${ADMIN_SECRET}/send">
<input type="hidden" name="id" value="${o.id}">
<button type="submit">Mark Sent</button>
</form>
</td>
</tr>`).join("");
  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Admin Dashboard - CoinTop</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="style.css">
</head>
<body>
<h2>Admin Dashboard</h2>
<table>
<tr><th>ID</th><th>Service</th><th>Package</th><th>Network</th><th>Name</th><th>Phone</th><th>Amount</th><th>Status</th><th>Action</th></tr>
${rows}
</table>
</body>
</html>
`);
});

// ---------------------
// Mark Sent
// ---------------------
app.post("/admin/:secret/send", bodyParser.urlencoded({ extended:true }), (req,res)=>{
  if(req.params.secret!==ADMIN_SECRET) return res.send("Unauthorized");
  const id = Number(req.body.id);
  const orders = readOrders();
  const order = orders.find(o=>o.id===id);
  if(order){
    order.status="sent";
    writeOrders(orders);
    axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,{
      chat_id: TELEGRAM_CHAT_ID,
      text:`✅ Order ID ${order.id} marked as sent!\nService: ${order.serviceType}\nPackage: ${order.packageOption}\nPhone: ${order.phone}`
    }).catch(console.log);
  }
  res.redirect(`/admin/${ADMIN_SECRET}`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT,()=>console.log(`CoinTop running on port ${PORT}`));
