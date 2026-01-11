const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Render Variables
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY;
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const SMEPLUG_SECRET_KEY = process.env.SMEPLUG_SECRET_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

// Markup / Interest
const MARKUP_PERCENT = 5;

// Orders storage
let orders = [];

// ---------------------
// 1️⃣ Homepage
// ---------------------
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>CoinTop - Airtime & Data</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body{margin:0;font-family:'Segoe UI',sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;
      background:linear-gradient(135deg,#0f2027,#203a43,#2c5364);overflow:hidden;color:#fff;animation:bgMove 20s linear infinite;}
    @keyframes bgMove{0%{background-position:0 0;}50%{background-position:100% 100%;}100%{background-position:0 0;}}
    .card{background:#111;padding:30px;border-radius:20px;width:95%;max-width:450px;box-shadow:0 15px 30px rgba(0,0,0,0.6);animation:fadeIn 1s ease-in;}
    @keyframes fadeIn{0%{opacity:0;transform:translateY(20px);}100%{opacity:1;transform:translateY(0);}}
    h1{text-align:center;color:#00ffcc;font-size:28px;margin-bottom:8px;}
    p{text-align:center;font-size:14px;color:#ccc;}
    label{display:block;margin-top:12px;font-size:13px;}
    select,input{width:100%;padding:12px;margin-top:6px;border-radius:8px;border:none;font-size:14px;background:#222;color:#fff;}
    button{width:100%;padding:14px;margin-top:18px;background:#00ffcc;border:none;border-radius:10px;font-size:16px;font-weight:bold;cursor:pointer;transition:0.3s;box-shadow:0 4px 10px rgba(0,255,204,0.4);}
    button:hover{background:#00ddb3;transform:scale(1.03);box-shadow:0 6px 15px rgba(0,255,204,0.6);}
    .footer{text-align:center;margin-top:15px;font-size:12px;color:#aaa;} a{color:#00ffcc;text-decoration:none;}
  </style>
</head>
<body>
  <div class="card">
    <h1>CoinTop</h1>
    <p>Fast automated airtime & data delivery</p>
    <form action="/checkout" method="POST">
      <label>Service</label>
      <select name="service" required>
        <option value="">Select service</option>
        <option value="airtime">Airtime</option>
        <option value="data">Data Bundle</option>
      </select>
      <label>Network</label>
      <select name="network" required>
        <option value="">Select network</option>
        <option>MTN</option>
        <option>Airtel</option>
        <option>Glo</option>
        <option>9mobile</option>
      </select>
      <label>Phone Number</label>
      <input type="tel" name="phone" placeholder="080xxxxxxxx" required>
      <label>Bundle / Amount</label>
      <select name="bundle" required>
        <option value="">Select Bundle</option>
        <option value="100">₦100</option>
        <option value="200">₦200</option>
        <option value="500">₦500</option>
        <option value="1000">₦1000</option>
      </select>
      <button type="submit">Proceed to Payment</button>
    </form>
    <div class="footer">Need help? <a href="https://t.me/TyburnUK" target="_blank"><b>Contact Admin</b></a></div>
  </div>
</body>
</html>
`);
});

// ---------------------
// 2️⃣ Checkout
// ---------------------
app.post("/checkout", async (req, res) => {
  const { service, network, phone, bundle } = req.body;
  const amount = Number(bundle);
  const finalAmount = (amount * (1 + MARKUP_PERCENT / 100)).toFixed(2);

  const order = { id: Date.now(), service, network, phone, amount: finalAmount, status: "pending" };
  orders.push(order);

  // Telegram notification
  axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    chat_id: TELEGRAM_CHAT_ID,
    text: `New Order!\nService: ${service}\nNetwork: ${network}\nPhone: ${phone}\nAmount: ₦${finalAmount}\nOrder ID: ${order.id}`
  }).catch(console.log);

  // Render Payment Page
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
.info{background:#1c1c1c;padding:15px;border-radius:12px;margin-top:15px;font-size:14px;animation:fadeIn 1.2s ease-in;}
.highlight{color:#00ffcc;font-weight:bold;}
.status{margin-top:15px;text-align:center;font-size:16px;}
button{padding:10px 16px;background:#00ffcc;border:none;border-radius:8px;font-weight:bold;cursor:pointer;transition:0.3s;box-shadow:0 3px 8px rgba(0,255,204,0.4);}
button:hover{transform:scale(1.05);box-shadow:0 5px 12px rgba(0,255,204,0.6);}
.footer{margin-top:15px;font-size:12px;text-align:center;color:#aaa;}
</style>
<script src="https://js.paystack.co/v1/inline.js"></script>
<script>
function payWithPaystack(){
  const handler = PaystackPop.setup({
    key: '${PAYSTACK_PUBLIC_KEY}',
    email: 'customer@example.com',
    amount: ${finalAmount * 100},
    currency: 'NGN',
    ref: '' + Math.floor(Math.random() * 1000000000 + 1),
    callback: function(response){
      fetch('/deliver/${order.id}', {method:'POST'})
      .then(()=>{document.getElementById('status').innerHTML='✅ Delivered!';});
    },
    onClose: function(){alert('Payment cancelled');}
  });
  handler.openIframe();
}
</script>
</head>
<body>
<div class="card">
<h2>Checkout - CoinTop</h2>
<div class="info">
<p><b>Service:</b> ${service}</p>
<p><b>Network:</b> ${network}</p>
<p><b>Phone:</b> ${phone}</p>
<p><b>Amount:</b> ₦${finalAmount}</p>
</div>
<div class="status" id="status">Click below to pay</div>
<button onclick="payWithPaystack()">Pay Now</button>
<div class="footer">Contact admin: <a href="https://t.me/TyburnUK" target="_blank"><b>Telegram</b></a></div>
</div>
</body>
</html>
`);
});

// ---------------------
// 3️⃣ Deliver Airtime/Data via SMEPlug
// ---------------------
app.post("/deliver/:id", async (req,res)=>{
  const order = orders.find(o=>o.id==req.params.id);
  if(!order) return res.status(404).send("Order not found");

  try{
    await axios.post("https://smeplug.ng/api/v1/airtime/purchase", {
      network_id: getNetworkID(order.network),
      phone: order.phone,
      amount: Number(order.amount),
      customer_reference: ""+order.id
    },{
      headers:{Authorization: `Bearer ${SMEPLUG_SECRET_KEY}`}
    });
    order.status="sent";

    // Telegram notification
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text: `✅ Order Delivered!\nService: ${order.service}\nNetwork: ${order.network}\nPhone: ${order.phone}\nAmount: ₦${order.amount}\nOrder ID: ${order.id}`
    });
    res.send("Delivered");
  }catch(e){
    console.log(e);
    res.status(500).send("Delivery failed");
  }
});

// ---------------------
// Helper for network mapping
// ---------------------
function getNetworkID(network){
  switch(network.toLowerCase()){
    case "mtn": return 1;
    case "airtel": return 2;
    case "glo": return 3;
    case "9mobile": return 4;
    default: return 1;
  }
}

// ---------------------
// 4️⃣ Admin Dashboard
// ---------------------
app.get("/admin/:secret",(req,res)=>{
  if(req.params.secret!==ADMIN_SECRET) return res.send("Unauthorized");
  let rows = orders.map(o=>`<tr><td>${o.id}</td><td>${o.service}</td><td>${o.network}</td><td>${o.phone}</td><td>₦${o.amount}</td><td>${o.status}</td></tr>`).join("");
  res.send(`
<!DOCTYPE html><html><head><title>Admin Dashboard</title><meta name="viewport" content="width=device-width, initial-scale=1">
<style>body{font-family:'Segoe UI',sans-serif;background:#111;color:#fff;padding:20px;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #444;padding:8px;text-align:center;}th{background:#222;color:#00ffcc;}</style>
</head><body>
<h2>Admin Dashboard</h2>
<table><tr><th>ID</th><th>Service</th><th>Network</th><th>Phone</th><th>Amount</th><th>Status</th></tr>${rows}</table>
</body></html>
  `);
});

// ---------------------
// Start Server
// ---------------------
app.listen(PORT,()=>console.log(`CoinTop running on port ${PORT}`));
