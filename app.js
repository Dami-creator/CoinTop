// ---------------------
// CoinTop Airtime, Data & TikTok Coins
// ---------------------
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Orders in memory
let orders = [];
const MARKUP_PERCENT = 5;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

// ---------------------
// Data for auto products
// ---------------------
const dataBundles = [
  {name: 'MTN 1GB', price: 500},
  {name: 'Airtel 1GB', price: 450},
  {name: 'Glo 1GB', price: 400},
  {name: '9mobile 1GB', price: 450}
];

const tiktokCoins = [
  {name: '50 Coins', price: 150},
  {name: '100 Coins', price: 300},
  {name: '200 Coins', price: 600}
];

const airtimeNetworks = ['MTN', 'Airtel', 'Glo', '9mobile'];

// ---------------------
// Homepage
// ---------------------
app.get("/", (req, res) => {
res.send(`
<!DOCTYPE html>
<html>
<head>
<title>CoinTop</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body{ margin:0; font-family:'Segoe UI',sans-serif; display:flex; justify-content:center; align-items:center; min-height:100vh; background: linear-gradient(135deg,#0f2027,#203a43,#2c5364); overflow:hidden; animation: bgMove 20s linear infinite; color:#fff; }
@keyframes bgMove { 0%{background-position:0 0;} 50%{background-position:100% 100%;} 100%{background-position:0 0;} }
.card{ background:#111; padding:30px; border-radius:20px; width:95%; max-width:450px; box-shadow:0 15px 30px rgba(0,0,0,0.6); animation: fadeIn 1s ease-in; }
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
<p>Fast manual airtime, data & TikTok coins</p>
<form action="/checkout" method="POST">
<label>Service</label>
<select name="service" id="service" required>
  <option value="airtime">Airtime</option>
  <option value="data">Data</option>
  <option value="tiktok">TikTok Coins</option>
</select>

<label id="inputLabel">Phone Number</label>
<input type="text" name="recipient" id="recipient" placeholder="080xxxxxxxx" required>

<label>Product</label>
<select name="product" id="product" required></select>

<label>Amount (₦)</label>
<input type="number" name="amount" id="amount" readonly>

<button type="submit">Proceed to Payment</button>
</form>
<div class="footer">Need help? <a href="https://t.me/TyburnUK">Contact Admin</a></div>
</div>

<script>
const serviceSelect = document.getElementById('service');
const productSelect = document.getElementById('product');
const amountInput = document.getElementById('amount');
const inputLabel = document.getElementById('inputLabel');
const recipientInput = document.getElementById('recipient');

function populateProducts(service){
  productSelect.innerHTML = '';
  amountInput.value = '';

  if(service==='airtime'){
    ${JSON.stringify(airtimeNetworks)}.forEach(n => {
      let price = 100; 
      let opt = document.createElement('option');
      opt.value = n;
      opt.textContent = n + ' - ₦' + Math.ceil(price * (1 + ${MARKUP_PERCENT}/100));
      opt.dataset.price = price;
      productSelect.appendChild(opt);
    });
    inputLabel.textContent = 'Phone Number';
    recipientInput.placeholder='080xxxxxxxx';
    productSelect.selectedIndex = 0;
    amountInput.value = Math.ceil(productSelect.options[0].dataset.price * (1 + ${MARKUP_PERCENT}/100));
  } else if(service==='data'){
    ${JSON.stringify(dataBundles)}.forEach(d => {
      let opt = document.createElement('option');
      opt.value = d.name;
      opt.textContent = d.name + ' - ₦' + Math.ceil(d.price * (1 + ${MARKUP_PERCENT}/100));
      opt.dataset.price = d.price;
      productSelect.appendChild(opt);
    });
    inputLabel.textContent = 'Phone Number';
    recipientInput.placeholder='080xxxxxxxx';
    productSelect.selectedIndex = 0;
    amountInput.value = Math.ceil(productSelect.options[0].dataset.price * (1 + ${MARKUP_PERCENT}/100));
  } else if(service==='tiktok'){
    ${JSON.stringify(tiktokCoins)}.forEach(c => {
      let opt = document.createElement('option');
      opt.value = c.name;
      opt.textContent = c.name + ' - ₦' + Math.ceil(c.price * (1 + ${MARKUP_PERCENT}/100));
      opt.dataset.price = c.price;
      productSelect.appendChild(opt);
    });
    inputLabel.textContent = 'TikTok Username';
    recipientInput.placeholder='Enter TikTok username';
    productSelect.selectedIndex = 0;
    amountInput.value = Math.ceil(productSelect.options[0].dataset.price * (1 + ${MARKUP_PERCENT}/100));
  }
}

serviceSelect.addEventListener('change', function(){ populateProducts(this.value); });
productSelect.addEventListener('change', function(){ 
  const selected = this.options[this.selectedIndex];
  if(selected && selected.dataset.price){
    amountInput.value = Math.ceil(selected.dataset.price * (1 + ${MARKUP_PERCENT}/100));
  }
});

// Initial load
populateProducts(serviceSelect.value);
</script>

</body>
</html>
`);
});

// ---------------------
// Checkout Page
// ---------------------
app.post("/checkout", (req,res)=>{
  const { service, product, recipient, amount } = req.body;
  const order = { id: Date.now(), service, product, recipient, amount, status:"pending" };
  orders.push(order);

  axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    chat_id: TELEGRAM_CHAT_ID,
    text:`New Order!\nService: ${service}\nProduct: ${product}\nRecipient: ${recipient}\nAmount: ₦${amount}\nOrder ID: ${order.id}`
  }).catch(console.log);

  res.send(`
  <!DOCTYPE html>
  <html>
  <head>
  <title>Payment - CoinTop</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body{margin:0;font-family:'Segoe UI',sans-serif;background:linear-gradient(135deg,#141e30,#243b55);color:#fff;min-height:100vh;display:flex;justify-content:center;align-items:center;}
    .card{background:#111;width:95%;max-width:450px;padding:25px;border-radius:20px;box-shadow:0 15px 30px rgba(0,0,0,0.6);animation:fadeIn 1s ease-in;}
    @keyframes fadeIn{0%{opacity:0;transform:translateY(20px);}100%{opacity:1;transform:translateY(0);}}
    h2{text-align:center;color:#00ffcc;}
    .info{background:#1c1c1c;padding:15px;border-radius:12px;margin-top:15px;font-size:14px;animation:fadeIn 1.2s ease-in;}
    .status{margin-top:15px;text-align:center;font-size:16px;}
    .footer{margin-top:15px;font-size:12px;text-align:center;color:#aaa;}
  </style>
  <script>
  function checkStatus(){
    fetch("/order-status/${order.id}")
    .then(res=>res.json())
    .then(data=>{
      document.getElementById("status").textContent = data.status==="sent"?"✅ Delivered!":"⏳ Awaiting admin...";
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
  <p><b>Product:</b> ${product}</p>
  <p><b>Recipient:</b> ${recipient}</p>
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
  </body>
  </html>
  `);
});

// ---------------------
// Order Status API
// ---------------------
app.get("/order-status/:id",(req,res)=>{
  const id = Number(req.params.id);
  const order = orders.find(o=>o.id===id);
  if(order) res.json({status: order.status}); else res.json({status:"not found"});
});

// ---------------------
// Admin Dashboard
// ---------------------
app.get("/admin/:secret",(req,res)=>{
  if(req.params.secret!==ADMIN_SECRET) return res.send("Unauthorized");
  let rows = orders.map(o=>`<tr><td>${o.id}</td><td>${o.service}</td><td>${o.product}</td><td>${o.recipient}</td><td>₦${o.amount}</td><td>${o.status}</td><td><form method="POST" action="/admin/${ADMIN_SECRET}/send"><input type="hidden" name="id" value="${o.id}"><button type="submit">Mark Sent</button></form></td></tr>`).join("");
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
// Mark Sent
// ---------------------
app.post("/admin/:secret/send", bodyParser.urlencoded({ extended:true }), (req,res)=>{
  if(req.params.secret!==ADMIN_SECRET) return res.send("Unauthorized");
  const id = Number(req.body.id);
  const order = orders.find(o=>o.id===id);
  if(order){
    order.status="sent";
    axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,{
      chat_id: TELEGRAM_CHAT_ID,
      text:`Order ID ${order.id} marked as sent!\nService: ${order.service}\nRecipient: ${order.recipient}`
    }).catch(console.log);
  }
  res.redirect(`/admin/${ADMIN_SECRET}`);
});

app.listen(PORT,()=>console.log(`CoinTop running on port ${PORT}`));
