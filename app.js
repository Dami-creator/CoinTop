// app.js
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// ---------------------
// Environment Variables
// ---------------------
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY; // Your Paystack secret
const SMEPLUG_API_KEY = process.env.SMEPLUG_API_KEY; // Your SMEPlug API key
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const ADMIN_SECRET = process.env.ADMIN_SECRET;
const MARKUP_PERCENT = 5; // Interest/markup

// ---------------------
// Fixed Products & Prices
// ---------------------
const AIRTIME_OPTIONS = [
  { network: "MTN", amount: 50 },
  { network: "MTN", amount: 100 },
  { network: "Airtel", amount: 50 },
  { network: "Glo", amount: 50 },
  { network: "9mobile", amount: 50 },
];

const DATA_BUNDLES = [
  { network: "MTN", plan: "100MB", amount: 200 },
  { network: "MTN", plan: "500MB", amount: 500 },
  { network: "Airtel", plan: "1GB", amount: 1000 },
  { network: "Glo", plan: "500MB", amount: 400 },
  { network: "9mobile", plan: "750MB", amount: 500 },
];

// Orders storage
let orders = [];

// ---------------------
// Home Page
// ---------------------
app.get("/", (req, res) => {
  let airtimeOptionsHtml = AIRTIME_OPTIONS.map(o => `<option value="${o.network}|${o.amount}">${o.network} - ₦${o.amount}</option>`).join("");
  let dataOptionsHtml = DATA_BUNDLES.map(o => `<option value="${o.network}|${o.plan}|${o.amount}">${o.network} - ${o.plan} - ₦${o.amount}</option>`).join("");

  res.send(`
  <!DOCTYPE html>
  <html>
  <head>
    <title>CoinTop - Airtime & Data</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      body{margin:0;font-family:'Segoe UI',sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;background:linear-gradient(135deg,#0f2027,#203a43,#2c5364);color:#fff;overflow:hidden;animation:bgMove 20s linear infinite;}
      @keyframes bgMove{0%{background-position:0 0;}50%{background-position:100% 100%;}100%{background-position:0 0;}}
      .card{background:#111;padding:30px;border-radius:20px;width:95%;max-width:500px;box-shadow:0 15px 30px rgba(0,0,0,0.6);animation:fadeIn 1s ease-in;}
      @keyframes fadeIn{0%{opacity:0;transform:translateY(20px);}100%{opacity:1;transform:translateY(0);}}
      h1{text-align:center;color:#00ffcc;font-size:28px;margin-bottom:10px;}
      label{display:block;margin-top:12px;font-size:14px;}
      input, select{width:100%;padding:12px;margin-top:6px;border-radius:8px;border:none;font-size:14px;background:#222;color:#fff;}
      button{width:100%;padding:14px;margin-top:18px;background:#00ffcc;border:none;border-radius:10px;font-size:16px;font-weight:bold;cursor:pointer;transition:0.3s;box-shadow:0 4px 10px rgba(0,255,204,0.4);}
      button:hover{background:#00ddb3;transform:scale(1.03);box-shadow:0 6px 15px rgba(0,255,204,0.6);}
      .footer{text-align:center;margin-top:15px;font-size:12px;color:#aaa;}
    </style>
  </head>
  <body>
    <div class="card">
      <h1>CoinTop</h1>
      <p>Fast Airtime & Data Recharge</p>

      <form action="/checkout" method="POST">
        <label>Select Service</label>
        <select name="service" required>
          <option value="">Choose</option>
          <option value="airtime">Airtime</option>
          <option value="data">Data</option>
        </select>

        <label>Airtime Options</label>
        <select name="airtime" id="airtimeSelect">
          <option value="">Select Airtime</option>
          ${airtimeOptionsHtml}
        </select>

        <label>Data Options</label>
        <select name="data" id="dataSelect">
          <option value="">Select Data</option>
          ${dataOptionsHtml}
        </select>

        <label>Phone Number</label>
        <input type="tel" name="phone" placeholder="080xxxxxxxx" required>

        <button type="submit">Proceed to Payment</button>
      </form>

      <div class="footer">Need help? <a href="https://t.me/TyburnUK" style="font-weight:bold;">Contact Admin</a></div>
    </div>

    <script>
      const airtimeSelect = document.getElementById("airtimeSelect");
      const dataSelect = document.getElementById("dataSelect");
      const serviceSelect = document.querySelector('select[name="service"]');

      serviceSelect.addEventListener("change", ()=>{
        if(serviceSelect.value==="airtime"){
          airtimeSelect.style.display="block";
          dataSelect.style.display="none";
        }else if(serviceSelect.value==="data"){
          dataSelect.style.display="block";
          airtimeSelect.style.display="none";
        }else{
          airtimeSelect.style.display="none";
          dataSelect.style.display="none";
        }
      });
      // Initialize
      airtimeSelect.style.display="none";
      dataSelect.style.display="none";
    </script>
  </body>
  </html>
  `);
});

// ---------------------
// Checkout Handler
// ---------------------
app.post("/checkout", async (req, res) => {
  const { service, airtime, data, phone } = req.body;

  let finalAmount, network, productDetails;

  if(service==="airtime" && airtime){
    [network, finalAmount] = airtime.split("|");
    productDetails = `${network} Airtime`;
  } else if(service==="data" && data){
    [network,, finalAmount] = data.split("|");
    productDetails = `${network} Data`;
  } else {
    return res.send("Invalid selection");
  }

  finalAmount = Number(finalAmount) * (1 + MARKUP_PERCENT/100);

  const order = {
    id: Date.now(),
    service,
    network,
    phone,
    amount: finalAmount.toFixed(2),
    status:"pending"
  };
  orders.push(order);

  // Send Telegram notification
  axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    chat_id: TELEGRAM_CHAT_ID,
    text:`New Order!\nService: ${productDetails}\nPhone: ${phone}\nAmount: ₦${order.amount}\nOrder ID: ${order.id}`
  }).catch(console.log);

  // ---------------------
  // Call SMEPlug API for automated delivery
  // ---------------------
  try{
    let payload = { network_id: 1, phone: phone, amount: Number(finalAmount), customer_reference: order.id.toString() };
    if(service==="data"){
      payload["plan"] = data.split("|")[1]; // add plan for data
    }
    await axios.post("https://smeplug.ng/api/v1/airtime/purchase", payload, {
      headers:{ Authorization: `Bearer ${SMEPLUG_API_KEY}` }
    });
    order.status="sent";
  } catch(e){
    console.log("SMEPlug API Error:", e.message);
  }

  // Success page
  res.send(`<h2>✅ Order Placed!</h2><p>Amount: ₦${order.amount}</p><p>Phone: ${phone}</p><p>Status: ${order.status}</p><a href="/">Go Home</a>`);
});

app.listen(PORT,()=>console.log(`CoinTop running on port ${PORT}`));
