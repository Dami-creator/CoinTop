// app.js
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Orders in memory
let orders = [];
const MARKUP_PERCENT = 5; // Your interest
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

// Fixed products with current prices
const DATA_BUNDLES = [
  { name: "MTN 1GB", price: 500 },
  { name: "MTN 2GB", price: 1000 },
  { name: "Airtel 1GB", price: 450 },
  { name: "Glo 1GB", price: 400 },
  { name: "9mobile 1GB", price: 480 },
];

const TIKTOK_COINS = [
  { name: "100 Coins", price: 200 },
  { name: "500 Coins", price: 900 },
  { name: "1000 Coins", price: 1700 },
];

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
    <p>Fast manual Airtime, Data & TikTok Coins</p>
    <form action="/checkout" method="POST">
      <label>Service</label>
      <select name="service" id="service" required onchange="updatePlaceholder()">
        <option value="">Choose</option>
        <option value="airtime">Airtime</option>
        <option value="data">Data</option>
        <option value="tiktok">TikTok Coins</option>
      </select>

      <label id="input-label">Phone Number</label>
      <input type="text" id="user-input" name="userInput" placeholder="080xxxxxxxx" required>

      <label id="option-label">Select Option</label>
      <select name="product" id="product" required>
        <option value="">Choose</option>
      </select>

      <button type="submit">Proceed</button>
    </form>
    <div class="footer">Need help? <a href="https://t.me/TyburnUK">Contact Admin</a></div>
  </div>

<script>
const dataBundles = ${JSON.stringify(DATA_BUNDLES)};
const tiktokCoins = ${JSON.stringify(TIKTOK_COINS)};

function updatePlaceholder(){
  const service = document.getElementById("service").value;
  const input = document.getElementById("user-input");
  const label = document.getElementById("input-label");
  const productSelect = document.getElementById("product");
  
  // Clear options
  productSelect.innerHTML = '<option value="">Choose</option>';

  if(service === "tiktok"){
    label.innerText = "TikTok Username";
    input.placeholder = "e.g. @username";
    tiktokCoins.forEach(c => {
      let opt = document.createElement("option");
      opt.value = c.name;
      opt.innerText = \`\${c.name} - ₦\${c.price}\`;
      productSelect.appendChild(opt);
    });
  } else if(service === "data"){
    label.innerText = "Phone Number";
    input.placeholder = "080xxxxxxxx";
    dataBundles.forEach(c => {
      let opt = document.createElement("option");
      opt.value = c.name;
      opt.innerText = \`\${c.name} - ₦\${c.price}\`;
      productSelect.appendChild(opt);
    });
  } else if(service === "airtime"){
    label.innerText = "Phone Number";
    input.placeholder = "080xxxxxxxx";
    // Airtime can just have network selection as option
    ["MTN","Airtel","Glo","9mobile"].forEach(n => {
      let opt = document.createElement("option");
      opt.value = n;
      opt.innerText = n;
      productSelect.appendChild(opt);
    });
  }
}
</script>
</body>
</html>
  `);
});

// ---------------------
// 2️⃣ Checkout
// ---------------------
app.post("/checkout", (req, res) => {
  const { service, product, userInput } = req.body;
  let price = 0;
  if(service === "tiktok"){
    price = TIKTOK_COINS.find(c=>c.name===product)?.price || 0;
  } else if(service === "data"){
    price = DATA_BUNDLES.find(c=>c.name===product)?.price || 0;
  } else if(service === "airtime"){
    price = 1000; // Default airtime price for demonstration
  }

  price = (price * (1 + MARKUP_PERCENT/100)).toFixed(2);

  const order = { id: Date.now(), service, product, userInput, amount: price, status: "pending" };
  orders.push(order);

  // Telegram notification
  axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    chat_id: TELEGRAM_CHAT_ID,
    text:`New Order!\nService: ${service}\nProduct: ${product}\nUser: ${userInput}\nAmount: ₦${price}\nOrder ID: ${order.id}`
  }).catch(console.log);

  res.send(`<h2>Order Received!</h2><p>Service: ${service}<br>Product: ${product}<br>User: ${userInput}<br>Amount: ₦${price}</p><p>Wait for admin to process.</p><a href="/">Go back</a>`);
});

// ---------------------
// 3️⃣ Admin Dashboard
// ---------------------
app.get("/admin/:secret", (req,res)=>{
  if(req.params.secret!==ADMIN_SECRET) return res.send("Unauthorized");
  let rows = orders.map(o=>`
    <tr>
      <td>${o.id}</td><td>${o.service}</td><td>${o.product}</td><td>${o.userInput}</td><td>₦${o.amount}</td><td>${o.status}</td>
      <td>
        <form method="POST" action="/admin/${ADMIN_SECRET}/send">
          <input type="hidden" name="id" value="${o.id}">
          <button type="submit">Mark Sent</button>
        </form>
      </td>
    </tr>
  `).join("");
  res.send(`<h2>Admin Dashboard</h2><table border="1" cellpadding="5"><tr><th>ID</th><th>Service</th><th>Product</th><th>User</th><th>Amount</th><th>Status</th><th>Action</th></tr>${rows}</table>`);
});

// ---------------------
// 4️⃣ Mark Sent
// ---------------------
app.post("/admin/:secret/send", bodyParser.urlencoded({extended:true}),(req,res)=>{
  if(req.params.secret!==ADMIN_SECRET) return res.send("Unauthorized");
  const id = Number(req.body.id);
  const order = orders.find(o=>o.id===id);
  if(order){
    order.status="sent";
    axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,{
      chat_id: TELEGRAM_CHAT_ID,
      text:`Order ID ${order.id} marked as sent!\nService: ${order.service}\nUser: ${order.userInput}`
    }).catch(console.log);
  }
  res.redirect(`/admin/${ADMIN_SECRET}`);
});

app.listen(PORT, ()=>console.log(`CoinTop running on port ${PORT}`));
