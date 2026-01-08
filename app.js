const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const axios = require("axios");
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Load variables
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const ADMIN_SECRET = process.env.ADMIN_SECRET;
const MARKUP_PERCENT = 5; // your interest/markup on all prices

// Orders in memory
let orders = [];

// ---------------------
// 1️⃣ Homepage
// ---------------------
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>CoinTop</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body{
      margin:0;font-family:'Segoe UI',sans-serif;
      display:flex;justify-content:center;align-items:center;
      min-height:100vh;
      background: linear-gradient(135deg,#0f2027,#203a43,#2c5364);
      overflow:hidden; color:#fff;
      animation:bgMove 20s linear infinite;
    }
    @keyframes bgMove{
      0%{background-position:0 0;}
      50%{background-position:100% 100%;}
      100%{background-position:0 0;}
    }
    .card{
      background:#111; padding:30px; border-radius:20px; width:95%; max-width:450px;
      box-shadow:0 15px 30px rgba(0,0,0,0.6);
      animation:fadeIn 1s ease-in;
    }
    @keyframes fadeIn{0%{opacity:0;transform:translateY(20px);}100%{opacity:1;transform:translateY(0);}}
    h1{text-align:center;color:#00ffcc;font-size:28px;margin-bottom:8px;}
    p{text-align:center;font-size:14px;color:#ccc;}
    label{display:block;margin-top:12px;font-size:13px;}
    input, select{width:100%;padding:12px;margin-top:6px;border-radius:8px;border:none;font-size:14px;background:#222;color:#fff;}
    button{width:100%;padding:14px;margin-top:18px;background:#00ffcc;border:none;border-radius:10px;font-size:16px;font-weight:bold;cursor:pointer;transition:0.3s;box-shadow:0 4px 10px rgba(0,255,204,0.4);}
    button:hover{background:#00ddb3;transform:scale(1.03);box-shadow:0 6px 15px rgba(0,255,204,0.6);}
    .footer{text-align:center;margin-top:15px;font-size:12px;color:#aaa;}
    a{color:#00ffcc;text-decoration:none;}
  </style>
</head>
<body>
  <div class="card">
    <h1>CoinTop</h1>
    <p>Fast manual airtime, data & TikTok coin recharge</p>
    <form action="/checkout" method="GET">
      <button type="submit">Purchase Now</button>
    </form>
    <div class="footer">Need help? <a href="https://t.me/TyburnUK">Contact Admin</a></div>
  </div>
</body>
</html>
  `);
});

// ---------------------
// 2️⃣ Checkout Page
// ---------------------
app.get("/checkout", (req,res)=>{
  // Load pricing
  const pricing = JSON.parse(fs.readFileSync("./data/pricing.json"));

  // Build TikTok coin options
  const tiktokOptions = pricing.tiktok_coins.map(
    c => `<option value="tiktok|${c.coins}|${c.price}">${c.coins} coins - ₦${c.price}</option>`
  ).join("");

  // Build data bundle options
  const dataOptions = pricing.data_bundles.map(
    d => `<option value="data|${d.network}|${d.bundle}|${d.price}">${d.network} - ${d.bundle} - ₦${d.price}</option>`
  ).join("");

  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>CoinTop Checkout</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body{margin:0;font-family:'Segoe UI',sans-serif;background:linear-gradient(135deg,#141e30,#243b55);color:#fff;min-height:100vh;display:flex;justify-content:center;align-items:center;}
.card{background:#111;width:95%;max-width:450px;padding:25px;border-radius:20px;box-shadow:0 15px 30px rgba(0,0,0,0.6);}
h2{text-align:center;color:#00ffcc;}
label{display:block;margin-top:12px;font-size:13px;}
input, select{width:100%;padding:12px;margin-top:6px;border-radius:8px;border:none;font-size:14px;background:#222;color:#fff;}
button{width:100%;padding:14px;margin-top:18px;background:#00ffcc;border:none;border-radius:10px;font-size:16px;font-weight:bold;cursor:pointer;transition:0.3s;box-shadow:0 4px 10px rgba(0,255,204,0.4);}
button:hover{background:#00ddb3;transform:scale(1.03);box-shadow:0 6px 15px rgba(0,255,204,0.6);}
.footer{text-align:center;margin-top:15px;font-size:12px;color:#aaa;}
a{color:#00ffcc;text-decoration:none;}
</style>
</head>
<body>
<div class="card">
<h2>Checkout</h2>
<form action="/checkout" method="POST">
<label>Service Option</label>
<select name="option" required>
  ${tiktokOptions}${dataOptions}
</select>
<label>Phone Number / TikTok Username</label>
<input type="text" name="account" placeholder="Phone or TikTok username" required>
<button type="submit">Proceed</button>
</form>
<div class="footer">Contact Admin: <a href="https://t.me/TyburnUK">Telegram</a></div>
</div>
</body>
</html>
  `);
});

// ---------------------
// 3️⃣ Handle Checkout Submission
// ---------------------
app.post("/checkout", (req,res)=>{
  const { option, account } = req.body;
  if(!option || !account) return res.send("Invalid submission");

  const parts = option.split("|");
  let service, network, bundleOrCoins, price;
  if(parts[0] === "tiktok") {
    service = "tiktok";
    bundleOrCoins = parts[1] + " coins";
    price = Number(parts[2]);
  } else {
    service = "data";
    network = parts[1];
    bundleOrCoins = parts[2];
    price = Number(parts[3]);
  }

  const finalAmount = Math.round(price*(1 + MARKUP_PERCENT/100));
  const order = {
    id: Date.now(),
    service, network, account,
    bundleOrCoins, amount: finalAmount,
    status:"pending"
  };
  orders.push(order);

  // Notify admin via Telegram
  axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,{
    chat_id: TELEGRAM_CHAT_ID,
    text:`New Order Received!\nService: ${service}\nAccount: ${account}\nBundle/Coins: ${bundleOrCoins}\nAmount: ₦${finalAmount}\nOrder ID: ${order.id}`
  }).catch(console.log);

  // Show instructions page
  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Payment - CoinTop</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body{margin:0;font-family:'Segoe UI',sans-serif;background:linear-gradient(135deg,#141e30,#243b55);color:#fff;min-height:100vh;display:flex;justify-content:center;align-items:center;}
.card{background:#111;width:95%;max-width:450px;padding:25px;border-radius:20px;box-shadow:0 15px 30px rgba(0,0,0,0.6);}
h2{text-align:center;color:#00ffcc;}
.info{background:#1c1c1c;padding:15px;border-radius:12px;margin-top:15px;font-size:14px;}
.status{margin-top:15px;text-align:center;font-size:16px;}
button{padding:10px 16px;background:#00ffcc;border:none;border-radius:8px;font-weight:bold;cursor:pointer;transition:0.3s;box-shadow:0 3px 8px rgba(0,255,204,0.4);}
button:hover{transform:scale(1.05);box-shadow:0 5px 12px rgba(0,255,204,0.6);}
.footer{margin-top:15px;font-size:12px;text-align:center;color:#aaa;}
</style>
<script>
function checkStatus(){
  fetch("/order-status/${order.id}")
    .then(res=>res.json())
    .then(data=>{
      document.getElementById("status").textContent = data.status==="sent"?"✅ Credited!":"⏳ Awaiting admin...";
      if(data.status!=="sent") setTimeout(checkStatus,3000);
    });
}
window.onload=checkStatus;
</script>
</head>
<body>
<div class="card">
<h2>Payment Instructions</h2>
<div class="info">
<p><b>Service:</b> ${service}</p>
<p><b>Account:</b> ${account}</p>
<p><b>Bundle/Coins:</b> ${bundleOrCoins}</p>
<p><b>Amount to Send:</b> ₦${finalAmount}</p>
<hr>
<p>Send exactly <b>₦${finalAmount}</b> to:</p>
<p><b>Damilola Fadiora</b></p>
<p><b>Kuda MFB</b></p>
<p><b>2035470845</b></p>
</div>
<div class="status" id="status">⏳ Awaiting admin...</div>
<div class="footer">Stay on this page until credited.<br>Contact admin: <a href="https://t.me/TyburnUK">Telegram</a></div>
</div>
</body>
</html>
  `);
});

// ---------------------
// 4️⃣ Order Status API
// ---------------------
app.get("/order-status/:id",(req,res)=>{
  const id = Number(req.params.id);
  const order = orders.find(o=>o.id===id);
  if(order) res.json({status: order.status});
  else res.json({status:"not found"});
});

// ---------------------
// 5️⃣ Admin Dashboard
// ---------------------
app.get("/admin/:secret",(req,res)=>{
  if(req.params.secret!==ADMIN_SECRET) return res.send("Unauthorized");
  let rows = orders.map(o=>`<tr>
    <td>${o.id}</td>
    <td>${o.service}</td>
    <td>${o.network || "-"}</td>
    <td>${o.account}</td>
    <td>${o.bundleOrCoins}</td>
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
<style>
body{font-family:'Segoe UI',sans-serif;background:#111;color:#fff;padding:20px;}
table{width:100%;border-collapse:collapse;}
th,td{border:1px solid #444;padding:8px;text-align:center;}
th{background:#222;color:#00ffcc;}
button{padding:6px 10px;border:none;border-radius:5px;background:#00ffcc;color:#111;cursor:pointer;transition:0.3s;}
button:hover{background:#00ddb3;}
</style>
</head>
<body>
<h2>Admin Dashboard</h2>
<table>
<tr><th>ID</th><th>Service</th><th>Network</th><th>Account</th><th>Bundle/Coins</th><th>Amount</th><th>Status</th><th>Action</th></tr>
${rows}
</table>
</body>
</html>
  `);
});

// ---------------------
// 6️⃣ Mark Sent
// ---------------------
app.post("/admin/:secret/send", bodyParser.urlencoded({ extended:true }), (req,res)=>{
  if(req.params.secret!==ADMIN_SECRET) return res.send("Unauthorized");
  const id = Number(req.body.id);
  const order = orders.find(o=>o.id===id);
  if(order){
    order.status="sent";
    axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,{
      chat_id: TELEGRAM_CHAT_ID,
      text:`Order ID ${order.id} marked as sent!\nService: ${order.service}\nAccount: ${order.account}`
    }).catch(console.log);
  }
  res.redirect(`/admin/${ADMIN_SECRET}`);
});

app.listen(PORT,()=>console.log(`CoinTop running on port ${PORT}`));
