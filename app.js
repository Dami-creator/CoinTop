const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// ---------------------
// SETTINGS
// ---------------------
const MARKUP_PERCENT = 5; // Your interest/markup
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

// ---------------------
// SAMPLE DATA
// ---------------------
const dataBundles = [
  { name: "500MB", price: 500 },
  { name: "1GB", price: 1000 },
  { name: "2GB", price: 2000 },
  { name: "5GB", price: 4500 },
];

const tiktokCoins = [
  { name: "100 Coins", price: 200 },
  { name: "500 Coins", price: 900 },
  { name: "1000 Coins", price: 1700 },
  { name: "5000 Coins", price: 8000 },
];

const airtimeNetworks = ["MTN", "Airtel", "Glo", "9mobile"];

// Orders in memory
let orders = [];

// ---------------------
// 1️⃣ Homepage
// ---------------------
app.get("/", (req, res) => {
  let dataOptions = dataBundles.map(
    d => `<option value="${d.name}" data-price="${d.price}">${d.name} - ₦${d.price}</option>`
  ).join("");
  let coinOptions = tiktokCoins.map(
    c => `<option value="${c.name}" data-price="${c.price}">${c.name} - ₦${c.price}</option>`
  ).join("");
  let airtimeOptions = airtimeNetworks.map(
    n => `<option value="${n}">${n}</option>`
  ).join("");

  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>CoinTop</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body{margin:0;font-family:'Segoe UI',sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;background:linear-gradient(135deg,#0f2027,#203a43,#2c5364);overflow:hidden;animation:bgMove 20s linear infinite;color:#fff;}
@keyframes bgMove {0%{background-position:0 0;}50%{background-position:100% 100%;}100%{background-position:0 0;}}
.card{background:#111;padding:30px;border-radius:20px;width:95%;max-width:450px;box-shadow:0 15px 30px rgba(0,0,0,0.6);animation:fadeIn 1s ease-in;}
@keyframes fadeIn {0%{opacity:0;transform:translateY(20px);}100%{opacity:1;transform:translateY(0);}}
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
<p>Fast Airtime, Data & TikTok Coins</p>
<form action="/checkout" method="POST">
<label>Service</label>
<select name="service" id="service" required>
<option value="">Choose</option>
<option value="airtime">Airtime</option>
<option value="data">Data</option>
<option value="tiktok">TikTok Coins</option>
</select>

<label id="networkLabel">Network / Package</label>
<select name="product" id="product" required>
<option value="">Select option</option>
</select>

<label id="inputLabel">Phone / Username</label>
<input type="text" name="recipient" id="recipient" placeholder="080xxxxxxxx or TikTok Username" required>

<label>Amount (₦)</label>
<input type="number" name="amount" id="amount" readonly>

<button type="submit">Proceed to Checkout</button>
</form>
<div class="footer">Need help? <a href="https://t.me/TyburnUK">Contact Admin</a></div>
</div>

<script>
const serviceSelect = document.getElementById('service');
const productSelect = document.getElementById('product');
const amountInput = document.getElementById('amount');
const inputLabel = document.getElementById('inputLabel');

const dataBundles = ${JSON.stringify(dataBundles)};
const tiktokCoins = ${JSON.stringify(tiktokCoins)};
const airtimeNetworks = ${JSON.stringify(airtimeNetworks)};

serviceSelect.addEventListener('change', function() {
  const service = this.value;
  productSelect.innerHTML = '<option value="">Select option</option>';
  amountInput.value = '';
  if(service==='airtime'){
    airtimeNetworks.forEach(n => {
      let opt = document.createElement('option');
      opt.value = n;
      opt.textContent = n;
      productSelect.appendChild(opt);
    });
    inputLabel.textContent = 'Phone Number';
    document.getElementById('recipient').placeholder='080xxxxxxxx';
  } else if(service==='data'){
    dataBundles.forEach(d => {
      let opt = document.createElement('option');
      opt.value = d.name;
      opt.textContent = d.name + ' - ₦' + d.price;
      opt.dataset.price = d.price;
      productSelect.appendChild(opt);
    });
    inputLabel.textContent = 'Phone Number';
    document.getElementById('recipient').placeholder='080xxxxxxxx';
  } else if(service==='tiktok'){
    tiktokCoins.forEach(c => {
      let opt = document.createElement('option');
      opt.value = c.name;
      opt.textContent = c.name + ' - ₦' + c.price;
      opt.dataset.price = c.price;
      productSelect.appendChild(opt);
    });
    inputLabel.textContent = 'TikTok Username';
    document.getElementById('recipient').placeholder='Enter TikTok username';
  }
});

productSelect.addEventListener('change', function(){
  let selected = this.options[this.selectedIndex];
  amountInput.value = selected.dataset.price ? Math.ceil(selected.dataset.price * (1 + ${MARKUP_PERCENT}/100)) : '';
});
</script>
</body>
</html>
  `);
});

// ---------------------
// 2️⃣ Checkout Page
// ---------------------
app.post("/checkout", (req,res)=>{
  const { service, product, recipient, amount } = req.body;
  if(!service || !product || !recipient || !amount){
    return res.send("All fields are required");
  }

  const order = {
    id: Date.now(),
    service,
    product,
    recipient,
    amount,
    status: "pending"
  };
  orders.push(order);

  // Notify via Telegram
  axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,{
    chat_id: TELEGRAM_CHAT_ID,
    text:`📦 New Order!
Service: ${service}
Product: ${product}
Recipient: ${recipient}
Amount: ₦${amount}
Order ID: ${order.id}`
  }).catch(console.log);

  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Checkout - CoinTop</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body{margin:0;font-family:'Segoe UI',sans-serif;background:linear-gradient(135deg,#141e30,#243b55);color:#fff;min-height:100vh;display:flex;justify-content:center;align-items:center;}
.card{background:#111;width:95%;max-width:450px;padding:25px;border-radius:20px;box-shadow:0 15px 30px rgba(0,0,0,0.6);animation:fadeIn 1s ease-in;}
@keyframes fadeIn{0%{opacity:0;transform:translateY(20px);}100%{opacity:1;transform:translateY(0);}}
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
      document.getElementById("status").textContent = data.status==="sent"?"✅ Completed!":"⏳ Awaiting admin...";
      if(data.status!=="sent") setTimeout(checkStatus,3000);
    });
}
window.onload=checkStatus;
</script>
</head>
<body>
<div class="card">
<h2>Checkout - CoinTop</h2>
<div class="info">
<p><b>Service:</b> ${order.service}</p>
<p><b>Product:</b> ${order.product}</p>
<p><b>Recipient:</b> ${order.recipient}</p>
<p><b>Amount to Send:</b> ₦${order.amount}</p>
<hr>
<p>Send exactly <b>₦${order.amount}</b> to:</p>
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
// 3️⃣ Order Status API
// ---------------------
app.get("/order-status/:id",(req,res)=>{
  const id = Number(req.params.id);
  const order = orders.find(o=>o.id===id);
  if(order) res.json({status: order.status});
  else res.json({status:"not found"});
});

// ---------------------
// 4️⃣ Admin Dashboard
// ---------------------
app.get("/admin/:secret",(req,res)=>{
  if(req.params.secret!==ADMIN_SECRET) return res.send("Unauthorized");
  let rows = orders.map(o=>`
<tr>
<td>${o.id}</td>
<td>${o.service}</td>
<td>${o.product}</td>
<td>${o.recipient}</td>
<td>₦${o.amount}</td>
<td>${o.status}</td>
<td>
<form method="POST" action="/admin/${ADMIN_SECRET}/send">
<input type="hidden" name="id" value="${o.id}">
<button type="submit">Mark Sent</button>
</form>
</td>
</tr>
`).join("");
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
<tr><th>ID</th><th>Service</th><th>Product</th><th>Recipient</th><th>Amount</th><th>Status</th><th>Action</th></tr>
${rows}
</table>
</body>
</html>
  `);
});

// ---------------------
// 5️⃣ Mark Sent
// ---------------------
app.post("/admin/:secret/send", bodyParser.urlencoded({ extended:true }), (req,res)=>{
  if(req.params.secret!==ADMIN_SECRET) return res.send("Unauthorized");
  const id = Number(req.body.id);
  const order = orders.find(o=>o.id===id);
  if(order){
    order.status="sent";
    axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,{
      chat_id: TELEGRAM_CHAT_ID,
      text:`✅ Order ID ${order.id} marked as sent!\nService: ${order.service}\nRecipient: ${order.recipient}`
    }).catch(console.log);
  }
  res.redirect(`/admin/${ADMIN_SECRET}`);
});

// ---------------------
// 6️⃣ Start Server
// ---------------------
app.listen(PORT,()=>console.log(`CoinTop running on port ${PORT}`));
