const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

let orders = [];

/* ================= HOME PAGE ================= */
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
  min-height:100vh;
  display:flex;
  justify-content:center;
  align-items:center;
  color:#fff;
}
.card{
  background:#111;
  padding:30px;
  width:92%;
  max-width:420px;
  border-radius:22px;
  box-shadow:0 15px 30px rgba(0,0,0,.6);
  animation:fadeIn 1s ease;
}
@keyframes fadeIn{
  from{opacity:0;transform:translateY(20px)}
  to{opacity:1;transform:translateY(0)}
}
h1{text-align:center;color:#00ffcc;}
.tag{text-align:center;color:#ccc;font-size:14px;margin-bottom:20px;}
label{display:block;margin-top:12px;font-size:13px;color:#ccc;}
input,select{
  width:100%;
  padding:12px;
  margin-top:5px;
  border:none;
  border-radius:8px;
  background:#222;
  color:#fff;
}
button{
  width:100%;
  margin-top:20px;
  padding:14px;
  border:none;
  border-radius:10px;
  background:#00ffcc;
  font-size:16px;
  font-weight:bold;
  cursor:pointer;
}
button:hover{background:#00ddb3;}
.footer{text-align:center;margin-top:15px;font-size:12px;color:#aaa;}
a{color:#00ffcc;text-decoration:none;}
</style>
</head>
<body>

<div class="card">
<h1>CoinTop</h1>
<p class="tag">Airtime • Data • TikTok Coins</p>

<form method="POST" action="/checkout">

<label>Service</label>
<select name="service" required>
  <option value="">Select</option>
  <option value="Airtime">Airtime</option>
  <option value="Data">Data Bundle</option>
  <option value="TikTok Coins">TikTok Coins</option>
</select>

<label>Network (for Airtime/Data)</label>
<select name="network">
  <option value="">Select</option>
  <option>MTN</option>
  <option>Airtel</option>
  <option>Glo</option>
  <option>9mobile</option>
</select>

<label>Phone / TikTok Username</label>
<input name="user" required placeholder="080xxxxxxx or @username">

<label>Package / Coins</label>
<input name="product" placeholder="e.g. 5GB / 1000 coins">

<label>Amount (₦)</label>
<input type="number" name="amount" required>

<button type="submit">Proceed to Checkout</button>
</form>

<div class="footer">
Need help? <a href="https://t.me/TyburnUK">Contact Admin</a>
</div>
</div>

</body>
</html>
`);
});

/* ================= CHECKOUT ================= */
app.post("/checkout", async (req, res) => {
  const { service, network, user, product, amount } = req.body;

  const order = {
    id: Date.now(),
    service,
    network,
    user,
    product,
    amount,
    status: "pending"
  };

  orders.push(order);

  // Telegram notification
  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text:
`🆕 NEW CoinTop ORDER
Service: ${service}
Network: ${network || "-"}
User: ${user}
Product: ${product}
Amount: ₦${amount}
Order ID: ${order.id}`
    });
  } catch (e) {}

  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Checkout - CoinTop</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body{
  background:linear-gradient(135deg,#141e30,#243b55);
  font-family:Segoe UI;
  color:#fff;
  display:flex;
  justify-content:center;
  align-items:center;
  min-height:100vh;
}
.card{
  background:#111;
  padding:25px;
  width:90%;
  max-width:420px;
  border-radius:20px;
}
h2{text-align:center;color:#00ffcc;}
p{font-size:14px;}
b{color:#00ffcc;}
</style>
</head>
<body>

<div class="card">
<h2>Payment Instructions</h2>

<p><b>Service:</b> ${service}</p>
<p><b>User:</b> ${user}</p>
<p><b>Product:</b> ${product}</p>
<p><b>Amount:</b> ₦${amount}</p>

<hr>

<p>Send exactly <b>₦${amount}</b> to:</p>
<p><b>Damilola Fadiora</b></p>
<p><b>Kuda MFB</b></p>
<p><b>2035470845</b></p>

<p style="margin-top:15px;font-size:13px;color:#ccc;">
Admin has been notified on Telegram.
</p>
</div>

</body>
</html>
`);
});

/* ================= ADMIN ================= */
app.get("/admin/:secret", (req, res) => {
  if (req.params.secret !== ADMIN_SECRET) return res.send("Unauthorized");

  let rows = orders.map(o => `
<tr>
<td>${o.id}</td>
<td>${o.service}</td>
<td>${o.user}</td>
<td>${o.product}</td>
<td>₦${o.amount}</td>
<td>${o.status}</td>
</tr>
`).join("");

  res.send(`
<h2>CoinTop Admin</h2>
<table border="1" cellpadding="8">
<tr>
<th>ID</th><th>Service</th><th>User</th><th>Product</th><th>Amount</th><th>Status</th>
</tr>
${rows}
</table>
`);
});

app.listen(PORT, () => {
  console.log("CoinTop running on port " + PORT);
});
